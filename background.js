// Background service worker for Unbind v2.0

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('[Unbind] Extension installed');
        chrome.tabs.create({ url: 'https://unbind.esali.com?installed=true' });
    } else if (details.reason === 'update') {
        console.log('[Unbind] Updated to', chrome.runtime.getManifest().version);
    }
});

// Handle download requests from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'downloadFile') {
        chrome.downloads.download({
            url: message.url,
            filename: message.filename,
            saveAs: true
        });
        sendResponse({ success: true });
    }
    return true;
});
