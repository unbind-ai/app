# ◈ Unbind

**Export your AI conversations. Own your data.**

A browser extension that lets you export your entire ChatGPT history with one click. Works with Free, Plus, and Teams accounts.

🧩 **[Install Extension](#installation)** · 🔍 **[Online Viewer](https://unbind-ai.github.io/app/viewer.html)** · 📄 **[UACS Format](#universal-format)**

---

## 🎯 Why Unbind?

- **ChatGPT Teams** has no export feature at all
- **ChatGPT Personal** export takes up to 30 days
- **Your conversations** contain valuable knowledge you created

You shouldn't need permission to access your own data.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **One-Click Export** | Click a button, get your data |
| **Works Everywhere** | Free, Plus, and Teams accounts |
| **Checkpoint Saves** | Auto-saves every 50 conversations |
| **Crash Recovery** | Resume if browser closes |
| **Rate Limit Handling** | Automatic retry with backoff |
| **Memory & GPTs** | Exports personalization data |
| **Universal Format** | UACS JSON standard |

---

## 📦 Installation

### Chrome / Edge / Brave

1. Download the [latest release](https://github.com/unbind-ai/app/releases)
2. Unzip the file
3. Go to `chrome://extensions`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the unzipped folder

### Firefox

Coming soon.

---

## 🚀 Usage

1. Install the extension
2. Go to [chatgpt.com](https://chatgpt.com)
3. Click the **Export** button in the sidebar
4. Wait for completion
5. Download your JSON file

### View Your Export

Upload your JSON to our [online viewer](https://unbind-ai.github.io/app/viewer.html) to:
- Search across all conversations
- Verify data integrity
- Browse your history

---

## 📄 Universal Format

Unbind exports use the **Universal AI Conversation Standard (UACS)** — a portable JSON format designed for AI conversation data.

```json
{
  "uacs_version": "1.0.0",
  "conversations": [
    {
      "id": "abc123",
      "title": "My Conversation",
      "source_platform": "chatgpt",
      "created_at": "2024-01-15T10:30:00.000Z",
      "messages": [
        {
          "role": "user",
          "content": "Hello!",
          "timestamp": "2024-01-15T10:30:00.000Z"
        },
        {
          "role": "assistant", 
          "content": "Hi there!",
          "model_name": "gpt-4o"
        }
      ]
    }
  ]
}
```

See [uacs_schema.json](./uacs_schema.json) for the full specification.

---

## 🔐 Privacy

- **100% Client-Side** — Your data never leaves your browser
- **No Accounts** — No sign-up, no tracking
- **No Servers** — We don't see or store anything
- **Open Source** — Audit the code yourself

---

## 🛠️ Development

```bash
# Clone repo
git clone https://github.com/unbind-ai/app.git

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer Mode
# 3. Load unpacked → select the folder
```

---

## 📋 Roadmap

- [x] ChatGPT export
- [x] Conversation viewer
- [x] UACS format standard
- [ ] Firefox support
- [ ] File attachment export
- [ ] More platforms (coming soon)

---

## 🤝 Contributing

Contributions welcome:
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit PRs

---

## 📜 License

© 2025 Unbind. All rights reserved.
Free to use. Code is proprietary.
---

*Your conversations. Your data. Your rules.* ◈

