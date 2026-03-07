// Background service worker for Unbind v2.0

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Unbind] Extension installed');
        chrome.tabs.create({ url: 'https://unbind.esali.com?installed=true' });
    } else if (details.reason === 'update') {
        console.log('[Unbind] Updated to', chrome.runtime.getManifest().version);
    }
});

// Track tabs that are exporting (prevent hibernation)
const exportingTabs = new Set();

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadFile') {
        // Support both dataUrl (from content script blob conversion) and direct url
        const downloadUrl = message.dataUrl || message.url;
        if (!downloadUrl) {
            sendResponse({ success: false, error: 'No URL provided' });
            return true;
        }
        chrome.downloads.download({
            url: downloadUrl,
            filename: message.filename,
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error('[Unbind] Download error:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('[Unbind] Download started, id:', downloadId);
                sendResponse({ success: true, downloadId });
            }
        });
        return true; // keep channel open for async sendResponse
    }

    // Tab keep-alive: content script signals export is running
    if (message.action === 'exportStarted') {
        if (sender.tab?.id) {
            exportingTabs.add(sender.tab.id);
            console.log('[Unbind] Export started on tab', sender.tab.id);
            startKeepAlive(sender.tab.id);
        }
        sendResponse({ success: true });
        return true;
    }

    if (message.action === 'exportFinished') {
        if (sender.tab?.id) {
            exportingTabs.delete(sender.tab.id);
            console.log('[Unbind] Export finished on tab', sender.tab.id);
        }
        sendResponse({ success: true });
        return true;
    }

    return true;
});

// Keep-alive: periodically ping the tab to prevent Edge from hibernating it
function startKeepAlive(tabId) {
    const interval = setInterval(() => {
        if (!exportingTabs.has(tabId)) {
            clearInterval(interval);
            return;
        }
        // Check if tab still exists
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError) {
                exportingTabs.delete(tabId);
                clearInterval(interval);
                return;
            }
            // Send a ping to keep the tab alive
            chrome.tabs.sendMessage(tabId, { action: 'keepAlive' }, () => {
                if (chrome.runtime.lastError) {
                    // Tab might have navigated away
                    exportingTabs.delete(tabId);
                    clearInterval(interval);
                }
            });
        });
    }, 25000); // every 25 seconds
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    exportingTabs.delete(tabId);
});
