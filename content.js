// ============================================================
// UNBIND EXTENSION v1.0.0 — Content Script
// Injected into chatgpt.com to enable one-click export
// Output format: UACS (Universal AI Conversation Standard)
// ============================================================

(function() {
    'use strict';

    // Prevent double-injection
    if (window.__UNBIND_LOADED__) return;
    window.__UNBIND_LOADED__ = true;

    const CONFIG = {
        VERSION: '1.0.0',
        UACS_VERSION: '1.0.0',
        DELAY_MS: 800,
        CHECKPOINT_INTERVAL: 50,
        MAX_RETRIES: 3,
        STORAGE_KEY: 'unbind_checkpoint',
    };

    const state = {
        conversations: [],
        messages: {},
        personalization: null,
        customGPTs: [],
        errors: [],
        startTime: null,
        isRunning: false,
        isPaused: false,
        currentIndex: 0,
    };

    // ============================================================
    // UI INJECTION
    // ============================================================

    function injectExportButton() {
        // Wait for ChatGPT sidebar to load
        const checkSidebar = setInterval(() => {
            const sidebar = document.querySelector('nav');
            if (sidebar && !document.getElementById('unbind-export-btn')) {
                clearInterval(checkSidebar);
                createExportButton(sidebar);
            }
        }, 1000);
    }

    function createExportButton(sidebar) {
        const btnContainer = document.createElement('div');
        btnContainer.id = 'unbind-export-btn';
        btnContainer.innerHTML = `
            <button id="unbind-trigger" title="Export all conversations with Unbind">
                <span class="unbind-icon">◈</span>
                <span class="unbind-text">Export</span>
            </button>
        `;
        
        // Insert at top of sidebar
        const firstChild = sidebar.firstChild;
        if (firstChild) {
            sidebar.insertBefore(btnContainer, firstChild);
        } else {
            sidebar.appendChild(btnContainer);
        }

        document.getElementById('unbind-trigger').addEventListener('click', showExportModal);
    }

    function showExportModal() {
        if (document.getElementById('unbind-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'unbind-modal';
        modal.innerHTML = `
            <div class="unbind-modal-backdrop"></div>
            <div class="unbind-modal-content">
                <div class="unbind-modal-header">
                    <div class="unbind-logo">◈</div>
                    <h2>Unbind Export</h2>
                    <button class="unbind-close" id="unbind-close">&times;</button>
                </div>
                
                <div id="unbind-start-view">
                    <p class="unbind-description">
                        Export all your ChatGPT conversations to a portable JSON file. 
                        Your data never leaves your browser.
                    </p>
                    
                    <div class="unbind-options">
                        <label class="unbind-checkbox">
                            <input type="checkbox" id="unbind-include-memory" checked>
                            <span>Include ChatGPT Memory & Custom Instructions</span>
                        </label>
                        <label class="unbind-checkbox">
                            <input type="checkbox" id="unbind-include-gpts" checked>
                            <span>Include Custom GPTs</span>
                        </label>
                    </div>
                    
                    <button id="unbind-start" class="unbind-btn-primary">
                        Start Export
                    </button>
                    
                    <p class="unbind-warning">
                        ⚠️ Keep this tab open until export completes. 
                        Progress is saved every 50 conversations.
                    </p>
                </div>
                
                <div id="unbind-progress-view" style="display: none;">
                    <div class="unbind-progress-bar">
                        <div class="unbind-progress-fill" id="unbind-progress-fill"></div>
                    </div>
                    
                    <div class="unbind-stats">
                        <div class="unbind-stat">
                            <span class="unbind-stat-value" id="unbind-stat-convos">0</span>
                            <span class="unbind-stat-label">Conversations</span>
                        </div>
                        <div class="unbind-stat">
                            <span class="unbind-stat-value" id="unbind-stat-msgs">0</span>
                            <span class="unbind-stat-label">Messages</span>
                        </div>
                        <div class="unbind-stat">
                            <span class="unbind-stat-value" id="unbind-stat-time">0:00</span>
                            <span class="unbind-stat-label">Elapsed</span>
                        </div>
                    </div>
                    
                    <p class="unbind-status" id="unbind-status">Initializing...</p>
                    
                    <div class="unbind-actions">
                        <button id="unbind-pause" class="unbind-btn-secondary">Pause</button>
                        <button id="unbind-cancel" class="unbind-btn-danger">Cancel</button>
                    </div>
                </div>
                
                <div id="unbind-complete-view" style="display: none;">
                    <div class="unbind-success-icon">✓</div>
                    <h3>Export Complete!</h3>
                    
                    <div class="unbind-final-stats">
                        <p><strong id="unbind-final-convos">0</strong> conversations</p>
                        <p><strong id="unbind-final-msgs">0</strong> messages</p>
                    </div>
                    
                    <button id="unbind-download" class="unbind-btn-primary">
                        Download JSON
                    </button>
                    
                    <p class="unbind-tip">
                        View your export at <a href="https://unbind-ai.github.io/app/viewer.html" target="_blank">unbind-ai.github.io/app/viewer</a>
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('unbind-close').addEventListener('click', closeModal);
        document.querySelector('.unbind-modal-backdrop').addEventListener('click', closeModal);
        document.getElementById('unbind-start').addEventListener('click', startExport);
        document.getElementById('unbind-pause').addEventListener('click', togglePause);
        document.getElementById('unbind-cancel').addEventListener('click', cancelExport);
    }

    function closeModal() {
        const modal = document.getElementById('unbind-modal');
        if (modal) modal.remove();
    }

    function showView(viewId) {
        ['unbind-start-view', 'unbind-progress-view', 'unbind-complete-view'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = id === viewId ? 'block' : 'none';
        });
    }

    // ============================================================
    // EXPORT LOGIC
    // ============================================================

    async function startExport() {
        state.isRunning = true;
        state.isPaused = false;
        state.startTime = Date.now();
        state.conversations = [];
        state.messages = {};
        state.errors = [];
        state.currentIndex = 0;

        showView('unbind-progress-view');
        updateStatus('Fetching conversation list...');

        // Check for checkpoint
        const checkpoint = loadCheckpoint();
        if (checkpoint && checkpoint.conversations.length > 0) {
            const resume = confirm(`Found checkpoint with ${checkpoint.conversations.length} conversations. Resume?`);
            if (resume) {
                state.conversations = checkpoint.conversations;
                state.messages = checkpoint.messages || {};
                state.currentIndex = Object.keys(state.messages).length;
            }
        }

        try {
            // Fetch all conversations if not resuming
            if (state.conversations.length === 0) {
                await fetchAllConversations();
            }

            // Fetch messages for each conversation
            await fetchAllMessages();

            // Fetch personalization if requested
            if (document.getElementById('unbind-include-memory')?.checked) {
                await fetchPersonalization();
            }

            // Complete
            showComplete();

        } catch (error) {
            console.error('[Unbind] Export error:', error);
            updateStatus('Error: ' + error.message);
            state.isRunning = false;
        }
    }

    async function fetchAllConversations() {
        let offset = 0;
        let hasMore = true;

        while (hasMore && state.isRunning) {
            while (state.isPaused) await sleep(500);

            const data = await fetchAPI(`/backend-api/conversations?offset=${offset}&limit=100&order=updated`);
            
            if (!data.items || data.items.length === 0) {
                hasMore = false;
            } else {
                state.conversations = state.conversations.concat(data.items);
                offset += data.items.length;
                updateStatus(`Found ${state.conversations.length} conversations...`);
                await sleep(300);
            }
        }

        console.log(`[Unbind] Found ${state.conversations.length} conversations`);
    }

    async function fetchAllMessages() {
        const total = state.conversations.length;

        for (let i = state.currentIndex; i < total && state.isRunning; i++) {
            while (state.isPaused) await sleep(500);

            const conv = state.conversations[i];
            
            try {
                const data = await fetchAPI(`/backend-api/conversation/${conv.id}`);
                if (data.mapping) {
                    state.messages[conv.id] = extractMessages(data.mapping);
                }
            } catch (error) {
                state.errors.push({ id: conv.id, error: error.message });
            }

            state.currentIndex = i + 1;
            updateProgress(i + 1, total);

            // Checkpoint save
            if ((i + 1) % CONFIG.CHECKPOINT_INTERVAL === 0) {
                saveCheckpoint();
            }

            await sleep(CONFIG.DELAY_MS);
        }
    }

    async function fetchPersonalization() {
        updateStatus('Fetching personalization data...');
        
        try {
            const [memory, settings, userMessages] = await Promise.all([
                fetchAPI('/backend-api/memories').catch(() => null),
                fetchAPI('/backend-api/settings/user').catch(() => null),
                fetchAPI('/backend-api/user_system_messages').catch(() => null),
            ]);

            state.personalization = {
                memory: memory?.memories || null,
                settings: settings || null,
                custom_instructions: userMessages || null,
            };
        } catch (error) {
            console.warn('[Unbind] Could not fetch personalization:', error);
        }
    }

    function extractMessages(mapping) {
        const messages = [];
        let rootId = null;

        for (const [id, node] of Object.entries(mapping)) {
            if (!node.parent) { rootId = id; break; }
        }

        function traverse(nodeId) {
            const node = mapping[nodeId];
            if (!node) return;

            const msg = node.message;
            if (msg?.content?.parts) {
                const content = msg.content.parts.join('');
                const role = msg.author?.role;

                if (content && (role === 'user' || role === 'assistant' || role === 'system' || role === 'tool')) {
                    messages.push({
                        id: msg.id || null,
                        role: role,
                        content: content,
                        timestamp: msg.create_time ? new Date(msg.create_time * 1000).toISOString() : null,
                        model_name: msg.metadata?.model_slug || null,
                        token_usage: null, // Not available from historical export
                        latency_ms: null,  // Not available from historical export
                    });
                }
            }

            if (node.children) node.children.forEach(id => traverse(id));
        }

        if (rootId) traverse(rootId);
        return messages;
    }

    // ============================================================
    // API HELPERS
    // ============================================================

    function getHeaders() {
        const headers = {};
        const accountCookie = document.cookie.split(';').find(c => c.trim().startsWith('_account='));
        if (accountCookie) {
            headers['chatgpt-account-id'] = accountCookie.split('=')[1];
        }
        return headers;
    }

    async function fetchAPI(url, retries = CONFIG.MAX_RETRIES) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    headers: getHeaders(),
                    credentials: 'include',
                });

                if (response.status === 429) {
                    const delay = 2000 * Math.pow(2, attempt);
                    updateStatus(`Rate limited. Waiting ${delay/1000}s...`);
                    await sleep(delay);
                    continue;
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                if (attempt >= retries) throw error;
                await sleep(2000 * Math.pow(2, attempt));
            }
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================================
    // UI UPDATES
    // ============================================================

    function updateProgress(current, total) {
        const percent = (current / total * 100).toFixed(1);
        const fill = document.getElementById('unbind-progress-fill');
        if (fill) fill.style.width = percent + '%';

        document.getElementById('unbind-stat-convos').textContent = current;
        
        const totalMsgs = Object.values(state.messages).reduce((sum, msgs) => sum + msgs.length, 0);
        document.getElementById('unbind-stat-msgs').textContent = totalMsgs;

        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        document.getElementById('unbind-stat-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        updateStatus(`Exporting... ${percent}% (${current}/${total})`);
    }

    function updateStatus(text) {
        const el = document.getElementById('unbind-status');
        if (el) el.textContent = text;
    }

    function showComplete() {
        state.isRunning = false;
        clearCheckpoint();
        showView('unbind-complete-view');

        const totalMsgs = Object.values(state.messages).reduce((sum, msgs) => sum + msgs.length, 0);
        document.getElementById('unbind-final-convos').textContent = state.conversations.length;
        document.getElementById('unbind-final-msgs').textContent = totalMsgs;

        document.getElementById('unbind-download').addEventListener('click', downloadExport);
    }

    // ============================================================
    // PAUSE / CANCEL
    // ============================================================

    function togglePause() {
        state.isPaused = !state.isPaused;
        const btn = document.getElementById('unbind-pause');
        if (btn) btn.textContent = state.isPaused ? 'Resume' : 'Pause';
        updateStatus(state.isPaused ? 'Paused' : 'Resuming...');
    }

    function cancelExport() {
        if (confirm('Cancel export? Progress will be saved and can be resumed later.')) {
            state.isRunning = false;
            saveCheckpoint();
            closeModal();
        }
    }

    // ============================================================
    // CHECKPOINT STORAGE
    // ============================================================

    function saveCheckpoint() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
                conversations: state.conversations,
                messages: state.messages,
                timestamp: Date.now(),
            }));
            console.log(`[Unbind] Checkpoint saved: ${Object.keys(state.messages).length} conversations`);
        } catch (e) {
            console.warn('[Unbind] Could not save checkpoint:', e);
        }
    }

    function loadCheckpoint() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    function clearCheckpoint() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    }

    // ============================================================
    // DOWNLOAD — UACS FORMAT
    // ============================================================

    function downloadExport() {
        const totalMsgs = Object.values(state.messages).reduce((sum, msgs) => sum + msgs.length, 0);

        // Build UACS-compliant export
        const exportData = {
            uacs_version: CONFIG.UACS_VERSION,
            export_metadata: {
                exported_at: new Date().toISOString(),
                exporter: `Unbind Extension v${CONFIG.VERSION}`,
                source_url: window.location.origin,
            },
            statistics: {
                total_conversations: state.conversations.length,
                total_messages: totalMsgs,
                conversations_with_errors: state.errors.length,
                export_duration_ms: Date.now() - state.startTime,
            },
            personalization: state.personalization,
            conversations: state.conversations.map(conv => ({
                id: conv.id,
                title: conv.title || 'Untitled',
                created_at: conv.create_time ? new Date(conv.create_time * 1000).toISOString() : null,
                updated_at: conv.update_time ? new Date(conv.update_time * 1000).toISOString() : null,
                source_platform: 'chatgpt',
                context: null, // Could include system prompts if available
                gizmo_id: conv.gizmo_id || null,
                is_archived: conv.is_archived || false,
                messages: state.messages[conv.id] || [],
                url: `https://chatgpt.com/c/${conv.id}`,
            })),
            errors: state.errors,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatgpt_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`[Unbind] Downloaded: ${state.conversations.length} conversations, ${totalMsgs} messages`);
    }

    // ============================================================
    // TAB CLOSE WARNING
    // ============================================================

    window.addEventListener('beforeunload', (e) => {
        if (state.isRunning) {
            e.preventDefault();
            e.returnValue = 'Export in progress. Are you sure you want to leave?';
        }
    });

    // ============================================================
    // INITIALIZE
    // ============================================================

    console.log(`[Unbind] Extension v${CONFIG.VERSION} loaded`);
    injectExportButton();

})();
