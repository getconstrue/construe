# Construe — AI Assistant Browser Extension

A browser extension that lets you highlight any text on any webpage and instantly analyze it using Claude AI — right in the side panel.

---

## Installation (Developer Mode)

1. **Download or clone** this repository to your local machine.

2. Open Chrome or Edge and navigate to:
   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** using the toggle in the top-right corner.

4. Click **"Load unpacked"** and select the `ai-assistant-extension` folder.

5. The **Construe** extension will appear in your browser toolbar.

---

## Usage

1. Click the **Construe** icon in the toolbar to open the side panel.
2. Click the ⚙️ Settings icon and enter your **Anthropic API Key** (format: `sk-ant-...`).
3. Select your preferred **response language** and **analysis mode**, then click **Save Settings**.
4. Go to any webpage and **highlight** any text.
5. The **"Ask Construe"** floating button will appear — click it.
6. The side panel opens with your selected text loaded — click **Analyze**.

---

## Features

- 🔍 **Floating button** appears whenever text is selected
- 🤖 **Claude AI** (claude-sonnet-4-20250514) as the underlying model
- 🌐 **5 analysis modes**: Explain, Summarize, Translate, Fact Check, Expand
- 💾 **Query history** — stores the last 20 queries locally
- 🔒 **API key** stored in `chrome.storage.local` — never sent anywhere except Anthropic
- ⌨️ **Right-click context menu** available as a secondary trigger

---

## Analysis Modes

| Mode | Description |
|------|-------------|
| Explain & Define | Break down the meaning and context of the selected text |
| Summarize | Extract the main points from a passage |
| Translate | Render the text in your chosen language |
| Fact Check | Assess the accuracy of claims in the text |
| Expand & Elaborate | Go deeper on the topic with related context and examples |

---

## File Structure

```
ai-assistant-extension/
├── manifest.json          ← Extension configuration (Manifest V3)
├── background.js          ← Service worker — message relay between components
├── content.js             ← Injected into webpages — floating button + text selection
├── assets/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── sidepanel/
    ├── sidepanel.html     ← Side panel UI markup
    ├── sidepanel.css      ← Side panel styles
    └── sidepanel.js       ← Side panel logic + Claude API calls
```

---

## Notes

- Requires an **Anthropic API Key** — sign up at [console.anthropic.com](https://console.anthropic.com)
- Compatible with **Chrome 114+** and **Edge 114+** (browsers that support the Side Panel API)
- All API calls are made **directly from the browser** to `api.anthropic.com` — no backend involved
