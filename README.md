# YoutubeGlance

Chrome Extension that extracts YouTube video captions and generates AI-ready summary prompts for multiple AI platforms.

<img width="335" height="558" alt="image" src="https://github.com/user-attachments/assets/e38c1b58-22e0-4c5f-b62f-e740b7f2a4a6" />


## Features

- Extract captions from YouTube videos with timestamps
- Support for 15 languages
- 8 AI platform support (ChatGPT, Claude, Gemini, AI Studio, Grok, DeepSeek, Kimi, Minimax)
- Auto-paste into AI platforms
- Customizable prompt templates
- Auto-send option
- Copy prompt to clipboard

## Prerequisites

- Chrome browser (or any Chromium-based browser: Brave, Edge, Vivaldi, Opera)
- Chrome version that supports Manifest V3

## Installation

### Developer Mode

1. Clone and build:
   ```bash
   npm install
   npm run build
   ```

2. Open `chrome://extensions/` and enable **Developer mode**

3. Click **Load unpacked** and select the `dist` folder

4. Extension icon should appear in Chrome toolbar

## Development

```bash
npm run build        # Build extension
npm run watch        # Watch for changes
npm test             # Run tests
npm run test:watch   # Watch tests
```

## Browser Compatibility

- Chrome, Brave, Edge, Vivaldi, Opera (Manifest V3)

## License

MIT License
