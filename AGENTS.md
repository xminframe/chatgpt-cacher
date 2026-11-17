# AGENTS.md — Instructions for AI Agents

You are editing the ChatGPT Message Virtualizer userscript.

## Project rules
- This is a single-file Tampermonkey userscript. Prefer keeping it self-contained unless the user explicitly asks to split it.
- Always use `@grant none`. Do not introduce `GM_*` functions, `fetch`, or any network activity.
- The script must remain safe and non-destructive. Prefer failing silently if selectors don’t match.
- Preserve the three core behaviors:
  1. Keep only the last N messages live.
  2. Cache detached nodes and restore them on scroll-up.
  3. Pause all work while streaming (Stop button visible).

## Code style
- Modern JavaScript (const/let, arrow functions, template literals).
- Clear section comments.
- Configurable constants at the top of the script.
- Avoid heavy dependencies or complex state machines unless necessary.
- Comment non-obvious scroll-compensation or selector logic.

## When updating selectors
ChatGPT’s DOM changes frequently. When the user reports that messages are no longer detected:
1. Ask for (or inspect) a fresh outerHTML sample of a user message and an assistant message.
2. Update the `TURN_SELECTOR` array, keeping older fallbacks.
3. Prefer stable data attributes over generated class names.
4. Test that both user and assistant messages are captured and that nested elements are not double-counted.

## Common tasks
- **Adjust aggressiveness**: Change `KEEP_LAST` and `RESTORE_BATCH`.
- **Improve scroll behavior**: Focus on the restore function and the `scrollTop` compensation logic.
- **Add a settings UI**: Keep it minimal (floating panel or Tampermonkey menu). Store settings in `localStorage`.
- **Mobile support**: Make sure scroll detection works with touch and that the badge doesn’t overlap the composer.

## What not to do
- Do not remove the streaming pause.
- Do not switch to HTML-string serialization unless there is a strong reason (DOM node caching is preferred).
- Do not add analytics, telemetry, or external requests.
- Do not make large refactors without preserving the current behavior first.

## Testing checklist (run after changes)
- [ ] Badge appears on a conversation page
- [ ] Older messages are removed after the threshold
- [ ] Scrolling up restores them with acceptable jump
- [ ] Streaming (Stop button) pauses pruning
- [ ] Switching conversations resets the cache
- [ ] No console errors during normal use
- [ ] Composer and message actions still work

## File locations
- Main script: `chatgpt-message-virtualizer.user.js`
- Project context: `CONTEXT.md` (read this first)
- This file: `AGENTS.md`