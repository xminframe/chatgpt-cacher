# CONTEXT.md — ChatGPT Message Virtualizer

## What this is
A Tampermonkey/Violentmonkey userscript that reduces lag in long ChatGPT conversations by unloading old messages from the DOM and restoring them on demand when the user scrolls up.

It is a lightweight virtual scroller for the chat transcript.

## Core goals
1. Keep the page responsive after ~20+ messages.
2. Automatically prune older messages while keeping the most recent ones fully interactive.
3. Restore older messages smoothly when the user scrolls upward (with scroll-position compensation).
4. Stay safe during streaming (do no DOM work while the model is generating).
5. Survive ChatGPT’s frequent DOM changes via flexible selectors + fallbacks.
6. Remain pure client-side (`@grant none`, no network calls).

## Current architecture (v1.0.0)
- **Selectors**: Prefer modern attributes observed in late 2026:
  - `[data-chatgpt-search-unit-key]`
  - `[data-content-search-unit-key]`
  - Fallbacks: `[data-testid^="conversation-turn"]`, `section[data-turn-id]`, `[data-message-author-role]`
- **Pruning**: Detaches older message nodes and stores the live DOM elements in an in-memory cache (oldest first).
- **Restoration**: On scroll near the top of the viewport, re-inserts a batch of cached nodes and compensates `scrollTop` so the view doesn’t jump.
- **Streaming safety**: Detects the Stop button and pauses all pruning/restoration while it is present.
- **SPA handling**: Watches for conversation changes (`/c/...`) and resets state.
- **UI**: Small floating badge showing live vs cached counts (click to toggle).

## Key design decisions
- Store actual DOM nodes (not HTML strings) so event listeners, React state, and media stay intact on restore.
- Prefer detaching over `display:none` or `content-visibility` for maximum performance gain.
- Keep the implementation small and debuggable rather than over-engineered.
- Hard pause during streaming instead of trying to be clever.
- Configurable constants at the top (`KEEP_LAST`, `RESTORE_BATCH`, `TOP_THRESHOLD`).

## Known limitations / future work
- Selector fragility: ChatGPT’s DOM changes often. The script uses multiple selectors but may need updates.
- Scroll compensation can still jump on some layouts or when messages have very different heights.
- Does not currently handle voice mode, temporary chats, or the /translate page specially.
- Cache is in-memory only (lost on full page reload — by design for now).
- No persistent settings UI yet.
- Mobile browser support is untested (touch scrolling, smaller viewports).

## How to test
1. Open a long conversation on chatgpt.com.
2. Confirm the badge appears and shows Live/Cached counts.
3. Scroll down — older messages should disappear from the DOM.
4. Scroll back up — they should reappear without a large jump.
5. Start a new message and confirm pruning pauses while the Stop button is visible.
6. Switch conversations and confirm the cache resets.
7. Check the browser console for errors.

## Important constraints
- Must work with `@grant none`.
- Must not interfere with the composer, send button, or streaming.
- Must not break copy/paste or message actions.
- Prefer failing quietly over breaking the page.