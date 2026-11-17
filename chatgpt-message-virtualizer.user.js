// ==UserScript==
// @name         ChatGPT Message Virtualizer
// @namespace    chatgpt-virtualizer
// @version      1.0.0
// @description  Unloads old ChatGPT messages to reduce lag. Restores them on scroll-up. Uses modern search-unit selectors + fallbacks. Stream-safe.
// @author       Custom (based on user HTML samples)
// @match        https://chatgpt.com/*
// @grant        none
// @run-at       document-end
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // ====================== CONFIG ======================
  const KEEP_LAST = 12;          // messages to keep fully loaded
  const RESTORE_BATCH = 6;       // how many to restore per scroll-up trigger
  const TOP_THRESHOLD = 180;     // px from top of viewport to trigger restore
  const MAX_CACHE = 250;         // hard limit on cached nodes (memory safety)
  const DEBOUNCE_MS = 300;
  const STREAM_POLL_MS = 400;

  // Modern selectors first (from your HTML samples + recent observations)
  const TURN_SELECTOR = [
    '[data-chatgpt-search-unit-key]',
    '[data-content-search-unit-key]',
    '[data-testid^="conversation-turn"]',
    'section[data-turn-id]',
    '[data-message-author-role]'
  ].join(', ');

  const STOP_SELECTOR = [
    '[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]',
    'button[aria-label*="stop streaming" i]',
    '#composer-submit-button[data-testid="stop-button"]'
  ].join(', ');

  // ====================== STATE ======================
  let cache = [];                 // [{el: HTMLElement}] — oldest first
  let observer = null;
  let scrollRoot = null;
  let scrollHandler = null;
  let debounceTimer = null;
  let streaming = false;
  let enabled = true;

  // ====================== HELPERS ======================
  function isConversationPage() {
    return /\/c\//.test(location.pathname);
  }

  function getTurns() {
    if (!isConversationPage()) return [];
    const nodes = Array.from(document.querySelectorAll(TURN_SELECTOR));
    // Prefer outer search-unit containers and dedupe
    const seen = new Set();
    return nodes.filter(el => {
      if (seen.has(el)) return false;
      // Prefer elements that look like full message units
      const isModern = el.hasAttribute('data-chatgpt-search-unit-key') ||
                       el.hasAttribute('data-content-search-unit-key');
      const isLegacy = el.matches('[data-testid^="conversation-turn"], section[data-turn-id]');
      if (isModern || isLegacy) {
        seen.add(el);
        return true;
      }
      return false;
    });
  }

  function getScrollRoot() {
    const explicit = document.querySelector('[data-scroll-root], #thread, main');
    if (explicit) {
      const style = getComputedStyle(explicit);
      if (['auto', 'scroll', 'overlay'].includes(style.overflowY) &&
          explicit.scrollHeight > explicit.clientHeight + 10) {
        return explicit;
      }
    }
    // Walk up from the first turn
    const turns = getTurns();
    let el = turns[0]?.parentElement;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (['auto', 'scroll', 'overlay'].includes(style.overflowY) &&
          el.scrollHeight > el.clientHeight + 10) {
        return el;
      }
      el = el.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function isAtBottom(root, threshold = 80) {
    if (!root) return true;
    return root.scrollHeight - root.scrollTop - root.clientHeight < threshold;
  }

  function isStreaming() {
    return !!document.querySelector(STOP_SELECTOR);
  }

  function updateBadge() {
    let badge = document.getElementById('cgpt-virt-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'cgpt-virt-badge';
      badge.style.cssText = `
        position: fixed;
        top: 12px;
        right: 16px;
        z-index: 99999;
        background: rgba(0,0,0,0.75);
        color: #fff;
        font: 12px/1.3 system-ui, sans-serif;
        padding: 6px 10px;
        border-radius: 999px;
        pointer-events: none;
        user-select: none;
        backdrop-filter: blur(4px);
      `;
      document.body.appendChild(badge);
    }
    const live = getTurns().length;
    badge.textContent = enabled
      ? `Live: ${live} | Cached: ${cache.length}`
      : 'Virtualizer: OFF';
  }

  // ====================== CORE ======================
  function prune() {
    if (!enabled || !isConversationPage() || streaming) return;

    const turns = getTurns();
    if (turns.length <= KEEP_LAST) {
      updateBadge();
      return;
    }

    const root = getScrollRoot();
    const wasAtBottom = isAtBottom(root);
    const bottomDist = wasAtBottom ? (root.scrollHeight - root.scrollTop - root.clientHeight) : null;

    const toRemove = turns.slice(0, turns.length - KEEP_LAST);
    for (const el of toRemove) {
      if (el.isConnected && !cache.some(c => c.el === el)) {
        cache.push({ el });
        el.remove();
      }
    }

    // Trim cache if it grows too large
    if (cache.length > MAX_CACHE) {
      cache.splice(0, cache.length - MAX_CACHE);
    }

    if (wasAtBottom && bottomDist != null) {
      requestAnimationFrame(() => {
        root.scrollTop = root.scrollHeight - root.clientHeight - bottomDist;
      });
    }
    updateBadge();
  }

  function restoreBatch() {
    if (!enabled || !cache.length || streaming) return;

    const turns = getTurns();
    const first = turns[0];
    if (!first || !first.parentElement) return;

    const root = getScrollRoot();
    const beforeTop = first.getBoundingClientRect().top;

    const batch = cache.splice(-RESTORE_BATCH); // take from the end (most recent of the cached)
    for (const item of batch) {
      if (item.el && !item.el.isConnected) {
        first.parentElement.insertBefore(item.el, first);
      }
    }

    requestAnimationFrame(() => {
      const afterTop = first.getBoundingClientRect().top;
      const delta = afterTop - beforeTop;
      if (Math.abs(delta) > 1) {
        root.scrollTop += delta;
      }
      updateBadge();
    });
  }

  function onScroll() {
    if (!enabled || streaming || !cache.length) return;
    const root = getScrollRoot();
    const turns = getTurns();
    if (!turns.length) return;

    const first = turns[0];
    const rect = first.getBoundingClientRect();
    // Trigger when the first visible message is near the top of the viewport
    if (rect.top < TOP_THRESHOLD + 40) {
      restoreBatch();
    }
  }

  // ====================== OBSERVERS ======================
  function startObservers() {
    if (observer) observer.disconnect();

    const target = document.querySelector('main') || document.body;
    observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!streaming && isConversationPage()) {
          prune();
        }
      }, DEBOUNCE_MS);
    });

    observer.observe(target, { childList: true, subtree: true });

    // Scroll listener
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      scrollRoot?.removeEventListener('scroll', scrollHandler);
    }
    scrollRoot = getScrollRoot();
    scrollHandler = onScroll;
    const scrollTarget = (scrollRoot && scrollRoot !== document.documentElement && scrollRoot !== document.body)
      ? scrollRoot
      : window;
    scrollTarget.addEventListener('scroll', scrollHandler, { passive: true });

    // Streaming detection poll
    setInterval(() => {
      const nowStreaming = isStreaming();
      if (nowStreaming !== streaming) {
        streaming = nowStreaming;
        if (!streaming && isConversationPage()) {
          setTimeout(prune, 200);
        }
      }
    }, STREAM_POLL_MS);
  }

  // ====================== INIT ======================
  function init() {
    if (!isConversationPage()) return;
    startObservers();
    setTimeout(prune, 800);
    updateBadge();

    // Re-init on SPA navigation
    let lastPath = location.pathname;
    setInterval(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        cache = [];
        setTimeout(() => {
          if (isConversationPage()) {
            startObservers();
            prune();
          }
        }, 600);
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Optional: click the badge to toggle (you can expand this later)
  document.addEventListener('click', (e) => {
    if (e.target.id === 'cgpt-virt-badge') {
      enabled = !enabled;
      updateBadge();
      if (enabled) prune();
    }
  });
})();