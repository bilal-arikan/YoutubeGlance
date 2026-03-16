# YouTube Summarize Extension

Chrome Extension that extracts YouTube video captions and generates a summary prompt for ChatGPT.

## 🎯 Features (MVP)

- Extract captions from YouTube videos (Turkish/English)
- Generate AI-ready summary prompts
- Copy prompt to clipboard
- Open ChatGPT with the prompt
- Language preference storage (TR/EN)

## 📋 Prerequisites

- Chrome browser (or any Chromium-based browser: Brave, Edge, Vivaldi, Opera)
- Chrome version that supports Manifest V3

## 🚀 Installation

### Developer Mode Installation

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three-dot menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch at the top right

3. **Load Unpacked Extension**
   - Click the "Load unpacked" button
   - Select the `youtube-summarize-extension` folder (project root)
   - Click "Select Folder" or "OK"

4. **Verify Installation**
   - Extension should appear in the extensions list
   - Extension icon should be visible in Chrome toolbar
   - Click the icon to open the popup

## 🧪 Testing the Extension

### Manual Testing

1. **Load Extension**
   - Follow installation steps above
   - Verify no errors in Chrome DevTools console

2. **Test Popup**
   - Click extension icon in toolbar
   - Popup should open and display content
   - Check Chrome DevTools for any console errors

3. **Test on YouTube** _(Coming in Story 2)_
   - Navigate to any YouTube video
   - Extension button will appear on video player
   - Click button to extract captions

## 🏗️ Project Structure

```
youtube-summarize-extension/
├── manifest.json           # Extension manifest (V3)
├── service-worker.js       # Background service worker
├── service-worker-utils.js # Service worker utilities
├── foreground.js           # Content script (for YouTube)
├── popup/                  # Extension popup UI
│   ├── popup.html
│   └── popup.css
├── logo/                   # Extension icons
│   ├── logo-16.png
│   ├── logo-48.png
│   └── logo-128.png
├── settings/               # Extension settings page
│   ├── settings.html
│   └── settings.css
└── README.md              # This file
```

## 🔧 Development

### Current Story: 1.1 - Project Initialization

✅ **Completed:**
- SimGus Chrome Extension V3 starter template setup
- Manifest V3 configuration
- Basic folder structure

### Next Steps:

- **Story 1.2:** TypeScript migration and configuration
- **Story 1.3:** Jest test framework setup
- **Story 1.4:** Chrome Extension Manifest V3 configuration
- **Story 1.5:** Project structure and base components

## 📖 Documentation

- [Architecture](_docs/architecture.md) - Technical architecture and ADRs
- [PRD](_docs/PRD.md) - Product requirements document
- [UX Design](_docs/ux.md) - UX patterns and design decisions
- [Epics & Stories](_docs/epics.md) - Development roadmap

## 🐛 Troubleshooting

### Extension doesn't load

- Check if manifest.json is valid JSON
- Verify all file paths in manifest.json are correct
- Check Chrome DevTools console for errors

### Changes not reflected

- Go to `chrome://extensions/`
- Click the reload button (circular arrow) on the extension card
- For most popup/settings changes, no reload is needed

### Service worker issues

1. Load extension with working service worker
2. Click "service worker" link on `chrome://extensions/`
3. Opens DevTools console for service worker
4. Test code snippets before adding to service worker

### Uninstalling the extension

1. Navigate to `chrome://extensions/`
2. Find the extension card
3. Click "Remove" button
4. Confirm deletion

## 🌐 Browser Compatibility

**Supported (Manifest V3):**
- ✅ Chrome
- ✅ Brave
- ✅ Edge
- ✅ Vivaldi
- ✅ Opera

**Not Supported:**
- ❌ Firefox (uses different extension format - WebExtensions)
- ❌ Safari (different extension format)
- ❌ Mobile browsers (no extension support)

## 📚 Resources

- [Chrome Extension Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Migration Guide (V2 → V3)](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)
- [SimGus Starter Template](https://github.com/SimGus/chrome-extension-v3-starter)

## 📝 License

MIT License

---

**Generated with:** [BMAD Methodology](https://github.com/bmad-agents/bmad)
**Based on:** SimGus Chrome Extension V3 Starter
