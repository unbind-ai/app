# Unbind

**Export your AI conversations. Own your data.**

A Chrome extension that exports your entire ChatGPT history with one click. Works with Free, Plus, and **Teams** accounts — the only tool that does.

[Install Extension](#installation) | [Website](https://unbind.esali.com) | [UACS Format](#universal-format)

---

## Why Unbind?

- **ChatGPT Teams** has no export feature at all
- **ChatGPT Personal** export takes up to 30 days and misses data
- **Your conversations** contain valuable knowledge you created

You shouldn't need permission to access your own data.

---

## Features

| Feature | Description |
|---------|-------------|
| **One-Click Export** | Click a button, get your data |
| **Teams Support** | The only tool that works with ChatGPT Teams |
| **3 Formats** | JSON (UACS), Markdown ZIP, CSV |
| **File Attachments** | Captures uploaded files, images, DALL-E outputs |
| **Code & Tools** | Preserves code interpreter outputs, plugin calls |
| **Archived Chats** | Exports archived conversations too |
| **Shared Links** | Captures shared conversation URLs |
| **Checkpoint Saves** | Auto-saves every 50 conversations |
| **Crash Recovery** | Resume if browser closes mid-export |
| **Parallel Fetch** | 3x faster with concurrent API calls |
| **Adaptive Speed** | Automatically adjusts to avoid rate limits |
| **Memory Export** | Exports personalization, memory, custom instructions |
| **Universal Format** | UACS JSON standard for data portability |
| **100% Private** | Your data never leaves your browser |

---

## Installation

### Chrome / Edge / Brave

1. Download the [latest release](https://unbind.esali.com)
2. Unzip the file
3. Go to `chrome://extensions`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the unzipped folder

### Firefox

Coming soon.

---

## Usage

1. Install the extension
2. Go to [chatgpt.com](https://chatgpt.com)
3. Click the **Export** button in the sidebar
4. Choose your format (JSON, Markdown, CSV)
5. Select what to include (archived, shared, memory)
6. Click **Start Export**
7. Download when complete

---

## Export Formats

### JSON (UACS)
The default. Structured, machine-readable, complete. Uses the Universal AI Conversation Standard for maximum portability.

### Markdown ZIP
Each conversation as a separate `.md` file in a ZIP archive. Human-readable, great for archiving or importing into note-taking apps.

### CSV
Flat table format: date, title, role, content, model. Perfect for analysis in spreadsheets or data tools.

---

## Universal Format

Unbind exports use the **Universal AI Conversation Standard (UACS)** — a portable JSON format designed for AI conversation data.

```json
{
  "uacs_version": "1.0.0",
  "export_metadata": {
    "exported_at": "2026-03-06T...",
    "workspace_name": "My Team",
    "account_type": "team"
  },
  "conversations": [
    {
      "id": "abc123",
      "title": "My Conversation",
      "source_platform": "chatgpt_teams",
      "is_archived": false,
      "is_shared": true,
      "share_url": "https://chatgpt.com/share/...",
      "messages": [
        {
          "role": "user",
          "content": "Hello!",
          "timestamp": "2026-01-15T10:30:00.000Z",
          "attachments": null
        },
        {
          "role": "assistant",
          "content": "Hi there!",
          "model_name": "gpt-4o",
          "attachments": [
            {
              "type": "generated_image",
              "dalle_prompt": "a sunset over mountains"
            }
          ]
        }
      ]
    }
  ]
}
```

See [uacs_schema.json](./uacs_schema.json) for the full specification.

---

## Privacy

- **100% Client-Side** — Your data never leaves your browser
- **No Accounts** — No sign-up, no tracking
- **No Servers** — We don't see or store anything
- **Open Source** — Audit the code yourself

---

## License

MIT License. Free to use, modify, and distribute.

---

*Your conversations. Your data. Your rules.*
