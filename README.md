# ChatGPT Message Virtualizer

A lightweight Tampermonkey / Violentmonkey userscript that keeps long ChatGPT conversations fast by unloading old messages from the DOM and restoring them when you scroll up.

After roughly 20+ messages the official UI becomes laggy. This script keeps only the most recent messages fully loaded, caches the rest as live DOM nodes, and brings them back on demand with scroll-position compensation.

## Features

- Keeps only the last N messages live in the DOM
- Automatically restores older messages when you scroll upward
- Stream-safe — pauses all work while the model is generating
- Uses modern ChatGPT selectors (`data-chatgpt-search-unit-key`, etc.) with legacy fallbacks
- SPA-aware (resets cleanly when switching conversations)
- Small floating badge showing live vs cached counts
- Pure client-side (`@grant none`) — no network requests, no data leaves your browser

## Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended)
   - or [Violentmonkey](https://violentmonkey.github.io/)
2. Click the raw script link below (or open the `.user.js` file) and let your userscript manager install it:
   - [Install from GitHub raw](https://raw.githubusercontent.com/YOUR_USERNAME/chatgpt-message-virtualizer/main/chatgpt-message-virtualizer.user.js)
3. Open [chatgpt.com](https://chatgpt.com) and start a conversation.

The badge appears in the top-right corner on conversation pages.

## Configuration

Open the script in your userscript manager and edit the constants near the top:

```js
const KEEP_LAST = 12;        // how many recent messages to keep loaded
const RESTORE_BATCH = 6;     // how many to restore per scroll-up trigger
const TOP_THRESHOLD = 180;   // px from top of viewport to trigger restore
```

Lower KEEP_LAST for better performance on very long chats. Higher values keep more context visible without scrolling.

## Usage

- Scroll down normally — older messages are automatically unloaded.
- Scroll back up — previously unloaded messages reappear.
- Click the badge to temporarily disable/enable the virtualizer.
- The script pauses automatically while ChatGPT is streaming a response.

## Browser support

- Desktop: Chrome, Edge, Firefox, Brave (with Tampermonkey/Violentmonkey)
- Mobile: Works in mobile browsers that support userscripts (e.g. Firefox Android + Violentmonkey, or Safari + Userscripts). Does not work inside the official ChatGPT app.

## Development / Contributing

See CONTEXT.md for project background and design decisions, and AGENTS.md for guidance if you’re using an AI coding agent.

Pull requests welcome, especially:
- Updated selectors when ChatGPT changes its DOM
- Improved scroll compensation
- Mobile polish
- Optional settings UI

## License

MIT — see LICENSE or the summary below.

## Disclaimer

This is an unofficial userscript. It is not affiliated with or endorsed by OpenAI. Use at your own risk. ChatGPT’s DOM changes frequently, so the script may need occasional updates.
