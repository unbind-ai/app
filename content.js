// ============================================================
// UNBIND v2.0.0 — Content Script
// Injected into chatgpt.com for one-click export
// Supports: Free, Plus, Teams accounts
// Output: UACS (Universal AI Conversation Standard)
// ============================================================

(function() {
    'use strict';

    if (window.__UNBIND_LOADED__) return;
    window.__UNBIND_LOADED__ = true;

    const CONFIG = {
        VERSION: '2.0.0',
        UACS_VERSION: '1.0.0',
        MIN_DELAY_MS: 400,
        MAX_DELAY_MS: 8000,
        CHECKPOINT_INTERVAL: 50,
        MAX_RETRIES: 5,
        CONCURRENCY: 3,
        STORAGE_KEY: 'unbind_checkpoint',
        LAST_EXPORT_KEY: 'unbind_last_export',
    };

    const state = {
        conversations: [],
        archivedConversations: [],
        messages: {},
        personalization: null,
        sharedConversations: [],
        errors: [],
        startTime: null,
        isRunning: false,
        isPaused: false,
        currentIndex: 0,
        currentDelay: CONFIG.MIN_DELAY_MS,
        successStreak: 0,
        totalMessages: 0,
        workspace: null,
        exportFormat: 'json',
        speedSamples: [],
    };

    // ============================================================
    // WORKSPACE DETECTION
    // ============================================================

    async function detectWorkspace() {
        try {
            const data = await fetchAPI('/backend-api/accounts/check');
            if (data?.accounts) {
                const accounts = Object.values(data.accounts);
                const teamAccount = accounts.find(a => a.account?.plan_type === 'team' || a.account?.plan_type === 'enterprise');
                const personalAccount = accounts.find(a => a.account?.plan_type === 'free' || a.account?.plan_type === 'plus' || a.account?.plan_type === 'chatgptplusplan');

                if (teamAccount) {
                    state.workspace = {
                        id: teamAccount.account?.account_id || null,
                        name: teamAccount.account?.structure || teamAccount.account?.account_name || 'Team Workspace',
                        type: teamAccount.account?.plan_type || 'team',
                        is_team: true,
                    };
                } else if (personalAccount) {
                    state.workspace = {
                        id: personalAccount.account?.account_id || null,
                        name: 'Personal',
                        type: personalAccount.account?.plan_type || 'free',
                        is_team: false,
                    };
                }
            }
        } catch (e) {
            console.warn('[Unbind] Could not detect workspace:', e);
            // Fall back to cookie detection
            const accountCookie = document.cookie.split(';').find(c => c.trim().startsWith('_account='));
            if (accountCookie) {
                state.workspace = {
                    id: accountCookie.split('=')[1],
                    name: 'Unknown',
                    type: 'unknown',
                    is_team: false,
                };
            }
        }
    }

    // ============================================================
    // UI INJECTION (robust, SPA-aware)
    // ============================================================

    const SIDEBAR_SELECTORS = [
        'nav',
        '[class*="sidebar"]',
        '[data-testid="sidebar"]',
        '.flex.flex-col.h-full',
    ];

    function findSidebar() {
        for (const sel of SIDEBAR_SELECTORS) {
            const el = document.querySelector(sel);
            if (el && el.offsetHeight > 200) return el;
        }
        return null;
    }

    function injectExportButton() {
        if (document.getElementById('unbind-export-btn')) return;

        const sidebar = findSidebar();
        if (sidebar) {
            createSidebarButton(sidebar);
        } else {
            createFloatingButton();
        }
    }

    function createSidebarButton(sidebar) {
        const btn = document.createElement('div');
        btn.id = 'unbind-export-btn';
        btn.innerHTML = `
            <button id="unbind-trigger" title="Export all conversations with Unbind">
                <span class="unbind-icon">\u25C8</span>
                <span class="unbind-text">Export</span>
            </button>
        `;
        const first = sidebar.firstChild;
        if (first) sidebar.insertBefore(btn, first);
        else sidebar.appendChild(btn);
        document.getElementById('unbind-trigger').addEventListener('click', showExportModal);
    }

    function createFloatingButton() {
        const btn = document.createElement('div');
        btn.id = 'unbind-export-btn';
        btn.className = 'unbind-floating';
        btn.innerHTML = `
            <button id="unbind-trigger" class="unbind-float-btn" title="Export all conversations with Unbind">
                <span class="unbind-icon">\u25C8</span>
            </button>
        `;
        document.body.appendChild(btn);
        document.getElementById('unbind-trigger').addEventListener('click', showExportModal);
    }

    // MutationObserver: re-inject on SPA navigation
    let _observer = null;
    function startObserver() {
        if (_observer) return;
        _observer = new MutationObserver(() => {
            if (!document.getElementById('unbind-export-btn')) {
                injectExportButton();
            }
        });
        _observer.observe(document.body, { childList: true, subtree: true });
    }

    // ============================================================
    // MODAL UI
    // ============================================================

    function showExportModal() {
        if (document.getElementById('unbind-modal')) return;

        const wsLabel = state.workspace
            ? `<div class="unbind-workspace">${state.workspace.is_team ? '\uD83C\uDFE2' : '\uD83D\uDC64'} ${state.workspace.name} <span class="unbind-ws-type">${state.workspace.type}</span></div>`
            : '';

        const modal = document.createElement('div');
        modal.id = 'unbind-modal';
        modal.innerHTML = `
            <div class="unbind-modal-backdrop"></div>
            <div class="unbind-modal-content">
                <div class="unbind-modal-header">
                    <div class="unbind-logo">\u25C8</div>
                    <div>
                        <h2>Unbind Export</h2>
                        ${wsLabel}
                    </div>
                    <button class="unbind-close" id="unbind-close">&times;</button>
                </div>

                <div id="unbind-start-view">
                    <p class="unbind-description">
                        Export all your ChatGPT conversations to a portable file.
                        Your data never leaves your browser.
                    </p>

                    <div class="unbind-section-label">Export Format</div>
                    <div class="unbind-format-options">
                        <label class="unbind-radio"><input type="radio" name="unbind-format" value="json" checked><span>JSON <em>(UACS standard)</em></span></label>
                        <label class="unbind-radio"><input type="radio" name="unbind-format" value="markdown"><span>Markdown ZIP</span></label>
                        <label class="unbind-radio"><input type="radio" name="unbind-format" value="csv"><span>CSV</span></label>
                    </div>

                    <div class="unbind-section-label">Include</div>
                    <div class="unbind-options">
                        <label class="unbind-checkbox"><input type="checkbox" id="unbind-include-archived" checked><span>Archived conversations</span></label>
                        <label class="unbind-checkbox"><input type="checkbox" id="unbind-include-memory" checked><span>Memory & Custom Instructions</span></label>
                        <label class="unbind-checkbox"><input type="checkbox" id="unbind-include-shared"><span>Shared conversations</span></label>
                    </div>

                    <button id="unbind-start" class="unbind-btn-primary">Start Export</button>

                    <p class="unbind-warning">
                        \u26A0\uFE0F Keep this tab open. Progress auto-saves every ${CONFIG.CHECKPOINT_INTERVAL} conversations.
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
                            <span class="unbind-stat-value" id="unbind-stat-eta">--:--</span>
                            <span class="unbind-stat-label">ETA</span>
                        </div>
                    </div>

                    <p class="unbind-status" id="unbind-status">Initializing...</p>
                    <p class="unbind-current-title" id="unbind-current-title"></p>

                    <div class="unbind-actions">
                        <button id="unbind-pause" class="unbind-btn-secondary">Pause</button>
                        <button id="unbind-cancel" class="unbind-btn-danger">Cancel</button>
                    </div>

                    <div id="unbind-error-list" class="unbind-error-list" style="display: none;"></div>
                </div>

                <div id="unbind-complete-view" style="display: none;">
                    <div class="unbind-success-icon">\u2713</div>
                    <h3>Export Complete!</h3>

                    <div class="unbind-final-stats">
                        <p><strong id="unbind-final-convos">0</strong> conversations</p>
                        <p><strong id="unbind-final-msgs">0</strong> messages</p>
                        <p id="unbind-final-errors" style="display: none;"><strong>0</strong> errors</p>
                    </div>

                    <button id="unbind-download" class="unbind-btn-primary">Download</button>

                    <p class="unbind-tip">
                        View your export at <a href="https://unbind.esali.com/viewer" target="_blank">unbind.esali.com/viewer</a>
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

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
    // EXPORT ORCHESTRATION
    // ============================================================

    async function startExport() {
        // Read format selection
        const formatRadio = document.querySelector('input[name="unbind-format"]:checked');
        state.exportFormat = formatRadio ? formatRadio.value : 'json';
        const includeArchived = document.getElementById('unbind-include-archived')?.checked;
        const includeShared = document.getElementById('unbind-include-shared')?.checked;

        state.isRunning = true;
        state.isPaused = false;
        state.startTime = Date.now();
        state.conversations = [];
        state.archivedConversations = [];
        state.messages = {};
        state.errors = [];
        state.currentIndex = 0;
        state.totalMessages = 0;
        state.currentDelay = CONFIG.MIN_DELAY_MS;
        state.successStreak = 0;
        state.speedSamples = [];

        showView('unbind-progress-view');
        updateStatus('Detecting workspace...');

        // Detect workspace
        await detectWorkspace();

        // Check for checkpoint
        const checkpoint = loadCheckpoint();
        if (checkpoint && checkpoint.conversations.length > 0) {
            const resume = confirm(`Found checkpoint with ${Object.keys(checkpoint.messages || {}).length}/${checkpoint.conversations.length} conversations exported. Resume?`);
            if (resume) {
                state.conversations = checkpoint.conversations;
                state.archivedConversations = checkpoint.archivedConversations || [];
                state.messages = checkpoint.messages || {};
                state.currentIndex = Object.keys(state.messages).length;
                state.totalMessages = Object.values(state.messages).reduce((s, m) => s + m.length, 0);
            }
        }

        try {
            // Fetch conversation lists
            if (state.conversations.length === 0) {
                await fetchAllConversations();

                if (includeArchived) {
                    await fetchArchivedConversations();
                }

                if (includeShared) {
                    await fetchSharedConversations();
                }
            }

            // Merge archived into main list for processing
            const allConvos = [...state.conversations, ...state.archivedConversations];
            state.conversations = allConvos;

            // Fetch messages with parallel execution
            await fetchAllMessagesParallel();

            // Fetch personalization
            if (document.getElementById('unbind-include-memory')?.checked !== false) {
                await fetchPersonalization();
            }

            showComplete();
        } catch (error) {
            console.error('[Unbind] Export error:', error);
            updateStatus('Error: ' + error.message);
            state.isRunning = false;
        }
    }

    // ============================================================
    // CONVERSATION FETCHING
    // ============================================================

    async function fetchAllConversations() {
        let offset = 0;
        let hasMore = true;

        while (hasMore && state.isRunning) {
            while (state.isPaused) await sleep(500);

            const data = await fetchAPI(`/backend-api/conversations?offset=${offset}&limit=100&order=updated`);
            if (!data?.items || data.items.length === 0) {
                hasMore = false;
            } else {
                // Tag as not archived
                data.items.forEach(c => { c._archived = false; });
                state.conversations = state.conversations.concat(data.items);
                offset += data.items.length;
                updateStatus(`Found ${state.conversations.length} conversations...`);
                await sleep(300);
            }
        }
        console.log(`[Unbind] Found ${state.conversations.length} active conversations`);
    }

    async function fetchArchivedConversations() {
        updateStatus('Fetching archived conversations...');
        let offset = 0;
        let hasMore = true;

        while (hasMore && state.isRunning) {
            while (state.isPaused) await sleep(500);

            try {
                const data = await fetchAPI(`/backend-api/conversations?offset=${offset}&limit=100&order=updated&is_archived=true`);
                if (!data?.items || data.items.length === 0) {
                    hasMore = false;
                } else {
                    data.items.forEach(c => { c._archived = true; });
                    state.archivedConversations = state.archivedConversations.concat(data.items);
                    offset += data.items.length;
                    updateStatus(`Found ${state.conversations.length} active + ${state.archivedConversations.length} archived...`);
                    await sleep(300);
                }
            } catch (e) {
                console.warn('[Unbind] Archived fetch failed:', e);
                hasMore = false;
            }
        }
        console.log(`[Unbind] Found ${state.archivedConversations.length} archived conversations`);
    }

    async function fetchSharedConversations() {
        updateStatus('Fetching shared conversations...');
        try {
            const data = await fetchAPI('/backend-api/shared_conversations?order=updated&limit=100');
            if (data?.items) {
                state.sharedConversations = data.items;
                console.log(`[Unbind] Found ${state.sharedConversations.length} shared conversations`);
            }
        } catch (e) {
            console.warn('[Unbind] Shared conversations not available:', e);
        }
    }

    // ============================================================
    // PARALLEL MESSAGE FETCHING
    // ============================================================

    async function fetchAllMessagesParallel() {
        const total = state.conversations.length;
        let completed = state.currentIndex;

        // Semaphore for concurrency control
        let running = 0;
        const queue = [];

        const processNext = () => {
            while (running < CONFIG.CONCURRENCY && queue.length > 0) {
                const task = queue.shift();
                running++;
                task().then(() => {
                    running--;
                    processNext();
                });
            }
        };

        const fetchPromises = [];

        for (let i = state.currentIndex; i < total; i++) {
            const idx = i;
            const promise = new Promise((resolve) => {
                const task = async () => {
                    while (state.isPaused) await sleep(500);
                    if (!state.isRunning) { resolve(); return; }

                    const conv = state.conversations[idx];
                    const fetchStart = Date.now();

                    try {
                        const data = await fetchAPI(`/backend-api/conversation/${conv.id}`);
                        if (data?.mapping) {
                            state.messages[conv.id] = extractMessages(data);
                            state.totalMessages += state.messages[conv.id].length;
                            state.successStreak++;

                            // Adaptive delay: speed up after successes
                            if (state.successStreak > 5 && state.currentDelay > CONFIG.MIN_DELAY_MS) {
                                state.currentDelay = Math.max(CONFIG.MIN_DELAY_MS, state.currentDelay - 100);
                            }
                        }
                    } catch (error) {
                        state.errors.push({ id: conv.id, title: conv.title, error: error.message });
                        state.successStreak = 0;
                    }

                    completed++;
                    state.currentIndex = completed;

                    // Speed tracking
                    const elapsed = Date.now() - fetchStart;
                    state.speedSamples.push(elapsed);
                    if (state.speedSamples.length > 20) state.speedSamples.shift();

                    updateProgress(completed, total);
                    updateCurrentTitle(conv.title || 'Untitled');

                    // Checkpoint
                    if (completed % CONFIG.CHECKPOINT_INTERVAL === 0) {
                        saveCheckpoint();
                    }

                    await sleep(state.currentDelay);
                    resolve();
                };
                queue.push(task);
            });
            fetchPromises.push(promise);
        }

        processNext();
        await Promise.all(fetchPromises);
    }

    // ============================================================
    // MESSAGE EXTRACTION (handles attachments, images, code)
    // ============================================================

    function extractMessages(conversationData) {
        const mapping = conversationData.mapping;
        const messages = [];
        let rootId = null;

        for (const [id, node] of Object.entries(mapping)) {
            if (!node.parent) { rootId = id; break; }
        }

        function traverse(nodeId) {
            const node = mapping[nodeId];
            if (!node) return;

            const msg = node.message;
            if (msg) {
                const role = msg.author?.role;
                if (role === 'user' || role === 'assistant' || role === 'system' || role === 'tool') {
                    const { text, attachments: contentAttachments } = extractContentParts(msg.content?.parts || []);

                    if (text || contentAttachments.length > 0 || role === 'tool') {
                        // Merge metadata attachments with content-derived attachments
                        const metadataAttachments = (msg.metadata?.attachments || []).map(a => ({
                            id: a.id || null,
                            filename: a.name || a.filename || null,
                            mime_type: a.mime_type || a.mimeType || null,
                            size_bytes: a.size || null,
                            url: a.download_url || null,
                            type: 'uploaded_file',
                        }));

                        const allAttachments = [...metadataAttachments, ...contentAttachments];

                        messages.push({
                            id: msg.id || null,
                            role: role,
                            content: text || '',
                            timestamp: msg.create_time ? new Date(msg.create_time * 1000).toISOString() : null,
                            model_name: msg.metadata?.model_slug || null,
                            token_usage: null,
                            latency_ms: null,
                            attachments: allAttachments.length > 0 ? allAttachments : null,
                            metadata: extractMessageMetadata(msg),
                        });
                    }
                }
            }

            if (node.children) node.children.forEach(id => traverse(id));
        }

        if (rootId) traverse(rootId);
        return messages;
    }

    function extractContentParts(parts) {
        let textParts = [];
        const attachments = [];

        for (const part of parts) {
            if (typeof part === 'string') {
                textParts.push(part);
            } else if (part && typeof part === 'object') {
                // DALL-E / uploaded image
                if (part.asset_pointer || part.content_type === 'image_asset_pointer') {
                    attachments.push({
                        id: part.asset_pointer || null,
                        filename: part.metadata?.dalle?.prompt ? 'dalle_image.png' : 'image.png',
                        mime_type: 'image/png',
                        size_bytes: part.size_bytes || null,
                        url: part.asset_pointer || null,
                        type: part.metadata?.dalle ? 'generated_image' : 'uploaded_image',
                        dalle_prompt: part.metadata?.dalle?.prompt || null,
                    });
                    if (part.metadata?.dalle?.prompt) {
                        textParts.push(`[DALL-E: ${part.metadata.dalle.prompt}]`);
                    } else {
                        textParts.push('[Image]');
                    }
                }
                // Code interpreter output
                else if (part.content_type === 'code' || part.content_type === 'execution_output') {
                    const lang = part.language || '';
                    const code = part.text || part.content || '';
                    textParts.push(lang ? `\`\`\`${lang}\n${code}\n\`\`\`` : code);
                }
                // Tether quote (web browsing)
                else if (part.content_type === 'tether_quote') {
                    textParts.push(`> ${part.title || ''}\n> ${part.text || ''}\n> Source: ${part.url || ''}`);
                }
                // Tether browsing display
                else if (part.content_type === 'tether_browsing_display') {
                    textParts.push(part.result || part.text || '');
                }
                // Multimodal text
                else if (part.content_type === 'text' || part.text) {
                    textParts.push(part.text || '');
                }
                // Fallback: stringify unknown objects
                else {
                    textParts.push(`[${part.content_type || 'unknown'}: ${JSON.stringify(part).substring(0, 200)}]`);
                }
            }
        }

        return { text: textParts.join(''), attachments };
    }

    function extractMessageMetadata(msg) {
        const meta = {};
        if (msg.metadata?.invoked_plugin) {
            meta.plugin = {
                namespace: msg.metadata.invoked_plugin.namespace,
                plugin_id: msg.metadata.invoked_plugin.plugin_id,
                type: msg.metadata.invoked_plugin.type,
            };
        }
        if (msg.metadata?.citations) {
            meta.citations = msg.metadata.citations.map(c => ({
                title: c.title,
                url: c.url,
            }));
        }
        if (msg.metadata?.finish_details) {
            meta.finish_reason = msg.metadata.finish_details.type;
        }
        return Object.keys(meta).length > 0 ? meta : null;
    }

    // ============================================================
    // PERSONALIZATION
    // ============================================================

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
        } catch (e) {
            console.warn('[Unbind] Personalization fetch failed:', e);
        }
    }

    // ============================================================
    // API HELPER (adaptive retry + rate limit)
    // ============================================================

    function getHeaders() {
        const headers = {};
        const accountCookie = document.cookie.split(';').find(c => c.trim().startsWith('_account='));
        if (accountCookie) {
            headers['chatgpt-account-id'] = accountCookie.split('=')[1].trim();
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
                    state.successStreak = 0;
                    const delay = Math.min(CONFIG.MAX_DELAY_MS, 2000 * Math.pow(2, attempt));
                    state.currentDelay = Math.min(CONFIG.MAX_DELAY_MS, state.currentDelay + 1000);
                    updateStatus(`Rate limited. Waiting ${Math.round(delay/1000)}s... (attempt ${attempt + 1}/${retries + 1})`);
                    await sleep(delay);
                    continue;
                }

                if (response.status === 403) {
                    throw new Error('Access denied (403). Session may have expired. Please refresh the page and try again.');
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
    // PROGRESS UI
    // ============================================================

    function updateProgress(current, total) {
        const percent = (current / total * 100).toFixed(1);
        const fill = document.getElementById('unbind-progress-fill');
        if (fill) fill.style.width = percent + '%';

        const el = (id) => document.getElementById(id);
        if (el('unbind-stat-convos')) el('unbind-stat-convos').textContent = current;
        if (el('unbind-stat-msgs')) el('unbind-stat-msgs').textContent = state.totalMessages;

        // ETA calculation
        if (state.speedSamples.length > 3) {
            const avgMs = state.speedSamples.reduce((a, b) => a + b, 0) / state.speedSamples.length;
            const remaining = total - current;
            const etaMs = remaining * (avgMs + state.currentDelay);
            const etaSec = Math.ceil(etaMs / 1000);
            const mins = Math.floor(etaSec / 60);
            const secs = etaSec % 60;
            if (el('unbind-stat-eta')) el('unbind-stat-eta').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        updateStatus(`Exporting... ${percent}% (${current}/${total})`);

        // Show errors
        if (state.errors.length > 0) {
            const errList = el('unbind-error-list');
            if (errList) {
                errList.style.display = 'block';
                errList.innerHTML = `<div class="unbind-error-header">${state.errors.length} error${state.errors.length > 1 ? 's' : ''}</div>` +
                    state.errors.slice(-5).map(e =>
                        `<div class="unbind-error-item">${e.title || e.id}: ${e.error}</div>`
                    ).join('');
            }
        }
    }

    function updateStatus(text) {
        const el = document.getElementById('unbind-status');
        if (el) el.textContent = text;
    }

    function updateCurrentTitle(title) {
        const el = document.getElementById('unbind-current-title');
        if (el) el.textContent = title.length > 60 ? title.substring(0, 57) + '...' : title;
    }

    // ============================================================
    // COMPLETION
    // ============================================================

    function showComplete() {
        state.isRunning = false;
        clearCheckpoint();
        showView('unbind-complete-view');

        document.getElementById('unbind-final-convos').textContent = state.conversations.length;
        document.getElementById('unbind-final-msgs').textContent = state.totalMessages;

        if (state.errors.length > 0) {
            const errEl = document.getElementById('unbind-final-errors');
            if (errEl) {
                errEl.style.display = 'block';
                errEl.querySelector('strong').textContent = state.errors.length;
            }
        }

        // Save last export stats
        try {
            localStorage.setItem(CONFIG.LAST_EXPORT_KEY, JSON.stringify({
                date: new Date().toISOString(),
                conversations: state.conversations.length,
                messages: state.totalMessages,
                errors: state.errors.length,
                format: state.exportFormat,
                workspace: state.workspace?.name || null,
            }));
        } catch {}

        // Completion sound (subtle)
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.1;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
        } catch {}

        document.getElementById('unbind-download').addEventListener('click', () => downloadExport());
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
        if (confirm('Cancel export? Progress will be saved.')) {
            state.isRunning = false;
            saveCheckpoint();
            closeModal();
        }
    }

    // ============================================================
    // CHECKPOINT
    // ============================================================

    function saveCheckpoint() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
                conversations: state.conversations,
                archivedConversations: state.archivedConversations,
                messages: state.messages,
                timestamp: Date.now(),
            }));
            console.log(`[Unbind] Checkpoint: ${Object.keys(state.messages).length}/${state.conversations.length}`);
        } catch (e) {
            console.warn('[Unbind] Checkpoint save failed:', e);
        }
    }

    function loadCheckpoint() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch { return null; }
    }

    function clearCheckpoint() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
    }

    // ============================================================
    // DOWNLOAD — MULTI-FORMAT
    // ============================================================

    function buildUACSExport() {
        // Build shared links map
        const sharedMap = {};
        state.sharedConversations.forEach(s => {
            sharedMap[s.conversation_id || s.id] = s.share_url || `https://chatgpt.com/share/${s.share_id || s.id}`;
        });

        return {
            uacs_version: CONFIG.UACS_VERSION,
            export_metadata: {
                exported_at: new Date().toISOString(),
                exporter: `Unbind Extension v${CONFIG.VERSION}`,
                source_url: window.location.origin,
                workspace_id: state.workspace?.id || null,
                workspace_name: state.workspace?.name || null,
                account_type: state.workspace?.type || null,
            },
            statistics: {
                total_conversations: state.conversations.length,
                total_messages: state.totalMessages,
                conversations_with_errors: state.errors.length,
                export_duration_ms: Date.now() - state.startTime,
                archived_conversations: state.archivedConversations.length,
            },
            personalization: state.personalization,
            conversations: state.conversations.map(conv => ({
                id: conv.id,
                title: conv.title || 'Untitled',
                created_at: conv.create_time ? new Date(conv.create_time * 1000).toISOString() : null,
                updated_at: conv.update_time ? new Date(conv.update_time * 1000).toISOString() : null,
                source_platform: state.workspace?.is_team ? 'chatgpt_teams' : 'chatgpt',
                context: null,
                gizmo_id: conv.gizmo_id || null,
                is_archived: conv._archived || conv.is_archived || false,
                is_shared: !!sharedMap[conv.id],
                share_url: sharedMap[conv.id] || null,
                messages: state.messages[conv.id] || [],
                url: `https://chatgpt.com/c/${conv.id}`,
            })),
            errors: state.errors,
        };
    }

    function downloadExport() {
        const format = state.exportFormat;

        if (format === 'json') {
            downloadJSON();
        } else if (format === 'markdown') {
            downloadMarkdownZip();
        } else if (format === 'csv') {
            downloadCSV();
        }
    }

    function downloadJSON() {
        const exportData = buildUACSExport();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        triggerDownload(blob, `chatgpt_export_${dateStamp()}.json`);
    }

    function downloadCSV() {
        const rows = [['date', 'conversation_title', 'role', 'content', 'model'].join(',')];

        for (const conv of state.conversations) {
            const msgs = state.messages[conv.id] || [];
            const title = (conv.title || 'Untitled').replace(/"/g, '""');
            for (const msg of msgs) {
                const content = (msg.content || '').replace(/"/g, '""').replace(/\n/g, '\\n');
                const date = msg.timestamp || '';
                rows.push(`"${date}","${title}","${msg.role}","${content}","${msg.model_name || ''}"`);
            }
        }

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        triggerDownload(blob, `chatgpt_export_${dateStamp()}.csv`);
    }

    async function downloadMarkdownZip() {
        updateStatus('Building Markdown ZIP...');

        // Minimal inline ZIP builder (no external dependencies)
        const files = [];

        for (const conv of state.conversations) {
            const msgs = state.messages[conv.id] || [];
            if (msgs.length === 0) continue;

            const date = conv.create_time ? new Date(conv.create_time * 1000).toISOString().split('T')[0] : 'unknown';
            const safeTitle = (conv.title || 'Untitled').replace(/[^a-zA-Z0-9 _-]/g, '').substring(0, 60).trim();
            const filename = `${date}_${safeTitle}.md`;

            let md = `# ${conv.title || 'Untitled'}\n\n`;
            md += `- **Date**: ${date}\n`;
            md += `- **URL**: https://chatgpt.com/c/${conv.id}\n`;
            if (conv._archived) md += `- **Archived**: yes\n`;
            md += `\n---\n\n`;

            for (const msg of msgs) {
                const label = msg.role === 'user' ? '**You**' : msg.role === 'assistant' ? '**ChatGPT**' : `**${msg.role}**`;
                md += `### ${label}`;
                if (msg.model_name) md += ` _(${msg.model_name})_`;
                md += `\n\n${msg.content || ''}\n\n`;

                if (msg.attachments) {
                    for (const att of msg.attachments) {
                        md += `> Attachment: ${att.filename || att.type || 'file'}`;
                        if (att.dalle_prompt) md += ` (DALL-E: "${att.dalle_prompt}")`;
                        md += `\n\n`;
                    }
                }
            }

            files.push({ name: filename, content: md });
        }

        // Build ZIP using minimal implementation
        const zipBlob = buildZip(files);
        triggerDownload(zipBlob, `chatgpt_export_${dateStamp()}.zip`);
    }

    // Minimal ZIP builder (no dependencies)
    function buildZip(files) {
        const encoder = new TextEncoder();
        const parts = [];
        const centralDir = [];
        let offset = 0;

        for (const file of files) {
            const nameBytes = encoder.encode(file.name);
            const contentBytes = encoder.encode(file.content);
            const crc = crc32(contentBytes);

            // Local file header
            const header = new Uint8Array(30 + nameBytes.length);
            const hv = new DataView(header.buffer);
            hv.setUint32(0, 0x04034b50, true); // signature
            hv.setUint16(4, 20, true);  // version needed
            hv.setUint16(6, 0, true);   // flags
            hv.setUint16(8, 0, true);   // compression (store)
            hv.setUint16(10, 0, true);  // mod time
            hv.setUint16(12, 0, true);  // mod date
            hv.setUint32(14, crc, true);
            hv.setUint32(18, contentBytes.length, true); // compressed
            hv.setUint32(22, contentBytes.length, true); // uncompressed
            hv.setUint16(26, nameBytes.length, true);
            hv.setUint16(28, 0, true);  // extra length
            header.set(nameBytes, 30);

            // Central directory entry
            const cdEntry = new Uint8Array(46 + nameBytes.length);
            const cv = new DataView(cdEntry.buffer);
            cv.setUint32(0, 0x02014b50, true);
            cv.setUint16(4, 20, true);
            cv.setUint16(6, 20, true);
            cv.setUint16(8, 0, true);
            cv.setUint16(10, 0, true);
            cv.setUint16(12, 0, true);
            cv.setUint16(14, 0, true);
            cv.setUint32(16, crc, true);
            cv.setUint32(20, contentBytes.length, true);
            cv.setUint32(24, contentBytes.length, true);
            cv.setUint16(28, nameBytes.length, true);
            cv.setUint16(30, 0, true);
            cv.setUint16(32, 0, true);
            cv.setUint16(34, 0, true);
            cv.setUint16(36, 0, true);
            cv.setUint32(38, 0x20, true);
            cv.setUint32(42, offset, true);
            cdEntry.set(nameBytes, 46);
            centralDir.push(cdEntry);

            parts.push(header, contentBytes);
            offset += header.length + contentBytes.length;
        }

        // Central directory
        const cdOffset = offset;
        let cdSize = 0;
        for (const cd of centralDir) {
            parts.push(cd);
            cdSize += cd.length;
        }

        // End of central directory
        const eocd = new Uint8Array(22);
        const ev = new DataView(eocd.buffer);
        ev.setUint32(0, 0x06054b50, true);
        ev.setUint16(4, 0, true);
        ev.setUint16(6, 0, true);
        ev.setUint16(8, files.length, true);
        ev.setUint16(10, files.length, true);
        ev.setUint32(12, cdSize, true);
        ev.setUint32(16, cdOffset, true);
        ev.setUint16(20, 0, true);
        parts.push(eocd);

        return new Blob(parts, { type: 'application/zip' });
    }

    // CRC32 for ZIP
    function crc32(data) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        console.log(`[Unbind] Downloaded: ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);
    }

    function dateStamp() {
        return new Date().toISOString().split('T')[0];
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
    // INIT
    // ============================================================

    console.log(`[Unbind] v${CONFIG.VERSION} loaded`);
    detectWorkspace().then(() => {
        injectExportButton();
        startObserver();
    });

})();
