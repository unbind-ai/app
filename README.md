# ◈ Unbind

**One interface. Every AI. Your data.**

Free your AI conversations from platform lock-in. Export, own, and explore your ChatGPT history.

🌐 **[Live Site](https://unbind-ai.github.io/app)** · 📦 **[Export Tool](https://unbind-ai.github.io/app/export.html)** · 🔍 **[Viewer](https://unbind-ai.github.io/app/viewer.html)**

---

## 🎯 Features

### Export Tool
- ✅ **One-click export** — Paste script, watch it run, download your data
- ✅ **Works with Teams** — Even when the export button is blocked
- ✅ **Checkpoint saves** — Auto-saves every 50 conversations (survives crashes)
- ✅ **Retry logic** — Handles rate limits gracefully
- ✅ **Custom GPTs** — Exports conversations with your GPTs
- ✅ **Memory export** — Captures personalization data

### Viewer
- 🔍 **Search** — Find any message across all conversations
- ✅ **Integrity check** — Verify nothing was lost
- 📊 **Statistics** — See conversation counts, date ranges, GPT usage
- 🎨 **Beautiful UI** — ChatGPT-like interface for browsing

---

## 🚀 Quick Start

### Export Your ChatGPT

1. Go to [chatgpt.com](https://chatgpt.com) and log in
2. Open browser console (`F12` → Console tab)
3. Copy the script from our [Export Page](https://unbind-ai.github.io/app/export.html)
4. Paste and press Enter
5. Wait for download (watch the progress overlay)

### View Your Export

1. Open the [Viewer](https://unbind-ai.github.io/app/viewer.html)
2. Click "Load Export File"
3. Select your JSON file
4. Browse, search, and verify your data

---

## 🔐 Privacy & Security

- **100% Client-Side** — Your data never leaves your browser
- **No Accounts** — No sign-up, no tracking, no data collection
- **Open Source** — Inspect every line of code
- **Local Storage Only** — Checkpoints saved in your browser

---

## 📊 Export Format

```json
{
  "schema_version": "2.0.0",
  "exported": "2025-12-03T21:27:49.000Z",
  "exporter": "Unbind v2.0.0",
  "source": "chatgpt",
  "statistics": {
    "total_conversations": 3256,
    "total_messages": 91435
  },
  "conversations": [
    {
      "id": "abc123",
      "title": "My Conversation",
      "created": "2024-01-15T10:30:00.000Z",
      "messages": [
        { "role": "user", "content": "Hello!" },
        { "role": "assistant", "content": "Hi there!" }
      ],
      "url": "https://chatgpt.com/c/abc123"
    }
  ]
}
```

---

## 🗺️ Roadmap

### Now (v2.0)
- [x] ChatGPT export
- [x] Viewer with search
- [x] Integrity verification
- [x] Checkpoint saves

### Next (v2.1)
- [ ] File/attachment export
- [ ] Deduplication
- [ ] Markdown export format

### Future
- [ ] Gemini export
- [ ] Claude export
- [ ] Universal format standard
- [ ] Multi-LLM chat interface
- [ ] MCP integrations

---

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

## 📜 License

MIT License — Use freely, modify freely, share freely.

---

## 💬 About

Built by the community to solve a real problem: **your AI conversations belong to you**.

ChatGPT Teams blocks exports. OpenAI's official export takes 30 days. You shouldn't need permission to access your own data.

**Unbind** is the first step toward a world where AI conversations are portable, private, and truly yours.

---

*Your conversations. Your data. Your control.* ◈
