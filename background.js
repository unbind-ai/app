// Background service worker for Unbind extension

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Unbind] Extension installed');
        // Open welcome page on install
        chrome.tabs.create({
            url: 'https://unbind-ai.github.io/app?installed=true'
        });
    } else if (details.reason === 'update') {
        console.log('[Unbind] Extension updated to', chrome.runtime.getManifest().version);
    }
});

// Handle messages from content script if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadFile') {
        // Handle download requests from content script
        chrome.downloads.download({
            url: message.url,
            filename: message.filename,
            saveAs: true
        });
        sendResponse({ success: true });
    }
    return true;
});
