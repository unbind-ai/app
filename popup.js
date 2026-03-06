// Popup script - detects tab, shows last export stats

document.addEventListener('DOMContentLoaded', async () => {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const instructions = document.getElementById('instructions');
    const openBtn = document.getElementById('openChatGPT');

    // Show last export stats
    try {
        const lastExport = localStorage.getItem('unbind_last_export');
        if (lastExport) {
            const data = JSON.parse(lastExport);
            const el = document.getElementById('lastExport');
            el.style.display = 'block';
            document.getElementById('leStats').innerHTML =
                `<strong>${data.conversations}</strong> conversations, <strong>${data.messages}</strong> messages` +
                (data.workspace ? ` from ${data.workspace}` : '');
            const d = new Date(data.date);
            document.getElementById('leDate').textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        }
    } catch {}

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab?.url?.includes('chatgpt.com') || tab?.url?.includes('chat.openai.com')) {
            statusIndicator.classList.remove('inactive');
            statusText.innerHTML = '<strong>Ready to export</strong>';
            instructions.innerHTML = 'Click the <strong>Export</strong> button in the ChatGPT sidebar to start your export.';
            openBtn.textContent = 'Refresh Page';
            openBtn.href = '#';
            openBtn.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.reload(tab.id); window.close(); });
        } else {
            statusIndicator.classList.add('inactive');
            statusText.innerHTML = 'Not on ChatGPT';
        }
    } catch (error) {
        console.error('Error:', error);
        statusIndicator.classList.add('inactive');
        statusText.innerHTML = 'Could not detect page';
    }
});
