/**
 * Claude Tab Colorist - Utilities & URL parsing
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ClaudeUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Checks if a URL belongs to Claude AI.
   */
  function isClaudeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'claude.ai' || parsed.hostname.endsWith('.claude.ai');
    } catch {
      return false;
    }
  }

  /**
   * Extracts the unique chat ID or project ID from a Claude URL.
   * Examples:
   *   https://claude.ai/chat/e0e98031-bb61-460b-853f-7233ec7c9a63 -> e0e98031-bb61-460b-853f-7233ec7c9a63
   *   https://claude.ai/project/abc-123 -> abc-123
   */
  function extractChatId(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url);
      // Matches /chat/:id
      const chatMatch = parsed.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
      if (chatMatch && chatMatch[1]) {
        return chatMatch[1];
      }
      // Matches /project/:id
      const projectMatch = parsed.pathname.match(/\/project\/([a-zA-Z0-9_-]+)/);
      if (projectMatch && projectMatch[1]) {
        return `project-${projectMatch[1]}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generates a stable storage key for a Claude tab/chat.
   * If a specific chat ID is available, uses "chat:<chatId>".
   * Otherwise falls back to "tab:<tabId>" or "url:<pathname>".
   */
  function getChatKey(url, tabId) {
    const chatId = extractChatId(url);
    if (chatId) {
      return `chat:${chatId}`;
    }
    if (tabId !== undefined && tabId !== null) {
      return `tab:${tabId}`;
    }
    try {
      const parsed = new URL(url);
      return `path:${parsed.pathname}`;
    } catch {
      return 'general';
    }
  }

  /**
   * Cleans a Claude document title to extract just the chat name.
   * Removes " - Claude", "Claude", and any leading bullets/emojis.
   */
  function cleanTitle(title) {
    if (!title || typeof title !== 'string') return 'New Chat';
    let clean = title.trim();
    // Remove "● " or other bullet indicators
    clean = clean.replace(/^[●•■◆\u25CF\u2022\u25A0\u25C6]\s*/, '');
    // Remove "- Claude" or "| Claude" suffix
    clean = clean.replace(/\s*[-–—|]\s*Claude\s*$/i, '');
    // If empty after stripping
    if (!clean || clean.toLowerCase() === 'claude') {
      return 'Claude Chat';
    }
    return clean;
  }

  /**
   * Debounce helper
   */
  function debounce(fn, waitMs) {
    let timeout = null;
    return function (...args) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        fn.apply(this, args);
      }, waitMs);
    };
  }

  return {
    isClaudeUrl,
    extractChatId,
    getChatKey,
    cleanTitle,
    debounce
  };
});
