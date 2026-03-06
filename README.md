# Unbind

**Your data. Your rules. No permission needed.**

A browser extension that liberates your AI conversation data. Built because no one should feel locked into a platform they can't leave.

[Download](https://unbind.esali.com) | [Why We Built This](#why-we-built-this) | [Install](#installation) | [UACS Standard](#universal-ai-conversation-standard)

---

## Why We Built This

In 2025, I migrated my ChatGPT account from a personal plan to Teams. What I discovered was alarming:

- **No way to migrate back** from Teams to personal
- **No export function** for Teams accounts at all
- **No practical way to leave** without abandoning months of conversations, custom GPTs, and projects

I filed complaints. I raised it with OpenAI support. Nothing changed. Users on the OpenAI forums have been calling this a **GDPR violation** for months.

So I built Unbind.

**This isn't just a tool — it's a statement.** Your conversations contain *your* knowledge, *your* ideas, *your* work. No platform should hold that hostage.

We believe in:
- **Data sovereignty** — you own what you create
- **Platform portability** — switching providers should be painless
- **Transparency** — our code is open, our motives are clear
- **Ethical AI** — AI companies should compete on quality, not lock-in

Unbind started with ChatGPT Teams because that's where the problem was most urgent. But the vision is bigger: **universal import/export for every AI platform.** A world where your data flows freely between services, where you choose a platform because it's *better*, not because you're trapped.

---

## What Unbind Exports

**Everything.** Not just conversations — your entire ChatGPT footprint:

| Data | Details |
|------|---------|
| **All Conversations** | Active, archived, and shared — with full message history |
| **Custom GPTs (MyGPTs)** | Instructions, knowledge files, actions, prompt starters, icons |
| **Projects** | Project folders with files, instructions, linked conversations |
| **Canvas / Artifacts** | Document and code outputs from ChatGPT Canvas |
| **File Attachments** | Uploaded files, DALL-E images, code interpreter outputs |
| **Memory** | Everything ChatGPT "remembers" about you |
| **Custom Instructions** | Your system prompts and preferences |
| **Profile & Settings** | Account info, beta features, data controls |
| **Teams Workspaces** | Auto-detects workspace type and exports accordingly |

### Export Formats

- **JSON (UACS)** — Structured, machine-readable, complete. The universal standard.
- **Markdown ZIP** — Each conversation as a `.md` file. Human-readable, great for note-taking apps.
- **CSV** — Flat table for spreadsheets and data analysis.

---

## Installation

### Chrome / Edge / Brave

1. Download from [unbind.esali.com](https://unbind.esali.com)
2. Unzip the file
3. Go to `chrome://extensions`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** → select the unzipped folder
6. Go to [chatgpt.com](https://chatgpt.com) and click **Export** in the sidebar

### Firefox

Coming soon.

---

## How It Works

Unbind runs entirely in your browser. It uses ChatGPT's own internal API (the same one the web app uses) to fetch your data. Nothing goes through our servers — because we don't have servers.

- **Parallel fetching** — 3 concurrent requests for 3x speed
- **Adaptive rate limiting** — automatically adjusts to avoid 429s
- **Checkpoint saves** — auto-saves every 50 conversations
- **Crash recovery** — resume if your browser closes mid-export
- **Teams detection** — auto-detects workspace type and uses correct auth headers

---

## Universal AI Conversation Standard (UACS)

Unbind exports use **UACS** — an open, portable JSON format for AI conversation data. The goal: a universal standard that any AI platform can export to and import from.

```json
{
  "uacs_version": "1.0.0",
  "export_metadata": {
    "workspace_name": "My Team",
    "account_type": "team"
  },
  "conversations": [...],
  "custom_gpts": [...],
  "projects": [...],
  "user_profile": {...},
  "personalization": {...}
}
```

See [uacs_schema.json](./uacs_schema.json) for the full specification.

We'd love for UACS to become a community standard. If you're building AI tools, consider supporting UACS import/export. PRs welcome.

---

## Privacy

This is non-negotiable:

- **100% Client-Side** — Your data never leaves your browser. Period.
- **No Accounts** — No sign-up, no tracking, no analytics.
- **No Servers** — We literally cannot see your data.
- **Open Source** — Every line of code is auditable.
- **No Telemetry** — We don't know how many people use Unbind, and we don't care.

---

## Roadmap

Unbind started with ChatGPT, but the vision is platform-agnostic data liberation:

- [x] ChatGPT Free/Plus export
- [x] ChatGPT Teams export (the only tool that does this)
- [x] Custom GPTs / MyGPTs export
- [x] Projects export
- [x] Canvas / Artifacts
- [x] 3 export formats (JSON, Markdown, CSV)
- [x] UACS universal format
- [ ] Firefox support
- [ ] Claude conversation export
- [ ] Gemini conversation export
- [ ] Universal import (UACS → any platform)
- [ ] Cross-platform migration tool

---

## The Bigger Picture

AI platforms are becoming the new operating systems. They hold our ideas, our workflows, our intellectual output. The conversation you had at 2 AM that sparked a business idea. The code your AI pair-programmed with you. The research thread that changed how you think about a problem.

**That data is yours.** Not OpenAI's. Not Google's. Not Anthropic's. Yours.

We believe the AI industry needs the same data portability guarantees that banking and telecom have. You can transfer your bank account. You can port your phone number. You should be able to port your AI conversations.

Unbind is step one. Join us.

---

## Contributing

This is a community project. We welcome:
- Bug reports and feature requests
- PRs for new platform support
- Translations
- UACS format improvements
- Spreading the word

---

## License

MIT License — free to use, modify, and distribute.

Built by [Arben Sali](https://twitter.com/arben_sali) and the Unbind community.

*Your conversations. Your data. Your rules.*
