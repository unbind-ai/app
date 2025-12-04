// Popup script - detects current tab and updates UI

document.addEventListener('DOMContentLoaded', async () => {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const instructions = document.getElementById('instructions');
    const openBtn = document.getElementById('openChatGPT');

    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab?.url?.includes('chatgpt.com') || tab?.url?.includes('chat.openai.com')) {
            // User is on ChatGPT
            statusIndicator.classList.remove('inactive');
            statusText.innerHTML = '<strong>Ready to export</strong>';
            instructions.innerHTML = 'Click the <strong>Export</strong> button in the ChatGPT sidebar to start your export.';
            openBtn.textContent = 'Refresh Page';
            openBtn.onclick = () => chrome.tabs.reload(tab.id);
        } else {
            // User is not on ChatGPT
            statusIndicator.classList.add('inactive');
            statusText.innerHTML = 'Not on ChatGPT';
            instructions.innerHTML = 'Navigate to <strong>chatgpt.com</strong> and click the <strong>Export</strong> button in the sidebar to start.';
        }
    } catch (error) {
        console.error('Error checking tab:', error);
        statusIndicator.classList.add('inactive');
        statusText.innerHTML = 'Could not detect page';
    }
});
