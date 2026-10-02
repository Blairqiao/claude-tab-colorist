/**
 * Claude Tab Colorist - Service Worker
 * Manifest V3 background service worker.
 * Purely event-driven and ephemeral; no long-lived global state.
 */

importScripts('../shared/colors.js', '../shared/utils.js', '../shared/storage.js');

// Lifecycle: Install & Update
chrome.runtime.onInstalled.addListener(async (details) => {
  // Ensure default settings exist in storage
  const settings = await ClaudeStorage.getSettings();
  await ClaudeStorage.saveSettings(settings);
  console.log('[ClaudeColorist] Extension installed/updated, settings initialized.');
});

// Update extension action badge when active tab changes
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await updateBadgeForTab(tab);
  } catch (err) {
    // Tab might have closed
  }
});

// Update badge when a tab's URL or status changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id === tabId) {
        await updateBadgeForTab(tab);
      }
    } catch (err) {
      // Tab might not be accessible
    }
  }
});

/**
 * Updates action badge with a subtle indicator of the active chat's color.
 */
async function updateBadgeForTab(tab) {
  if (!tab || !tab.url || !ClaudeUtils.isClaudeUrl(tab.url)) {
    await chrome.action.setBadgeText({ text: '' });
    return;
  }

  try {
    const chatKey = ClaudeUtils.getChatKey(tab.url, tab.id);
    const colorInfo = await ClaudeStorage.resolveColor(chatKey, tab.title);
    
    // Set badge text with a clean bullet or initials
    await chrome.action.setBadgeText({ text: '●' });
    await chrome.action.setBadgeBackgroundColor({ color: colorInfo.hex });
  } catch (err) {
    console.warn('[ClaudeColorist] Failed to update badge:', err);
  }
}

/**
 * Broadcasts a message to all open Claude tabs.
 */
async function broadcastToClaudeTabs(message) {
  try {
    const tabs = await chrome.tabs.query({
      url: ['https://claude.ai/*', 'https://*.claude.ai/*']
    });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (err) {
        // Tab might not have content script ready yet; ignore
      }
    }
  } catch (err) {
    console.warn('[ClaudeColorist] Error broadcasting to tabs:', err);
  }
}

/**
 * Central Message Handler
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Wrap async response in immediately invoked async function
  (async () => {
    try {
      const type = message && message.type;

      switch (type) {
        case 'GET_CURRENT_TAB_STATUS': {
          // Identify sender or query active tab
          let tab = sender.tab;
          if (!tab) {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            tab = activeTab;
          }

          if (!tab || !tab.url) {
            sendResponse({ success: false, isClaude: false });
            return;
          }

          const isClaude = ClaudeUtils.isClaudeUrl(tab.url);
          const chatId = isClaude ? ClaudeUtils.extractChatId(tab.url) : null;
          const chatKey = isClaude ? ClaudeUtils.getChatKey(tab.url, tab.id) : null;
          const cleanTitle = ClaudeUtils.cleanTitle(tab.title);
          const colorInfo = isClaude ? await ClaudeStorage.resolveColor(chatKey, cleanTitle) : null;
          const settings = await ClaudeStorage.getSettings();

          sendResponse({
            success: true,
            isClaude,
            tabId: tab.id,
            windowId: tab.windowId,
            url: tab.url,
            rawTitle: tab.title,
            cleanTitle,
            chatId,
            chatKey,
            colorInfo,
            settings
          });
          break;
        }

        case 'GET_ALL_CLAUDE_TABS': {
          const tabs = await chrome.tabs.query({
            url: ['https://claude.ai/*', 'https://*.claude.ai/*']
          });

          const tabsWithColor = await Promise.all(
            tabs.map(async (t) => {
              const chatKey = ClaudeUtils.getChatKey(t.url, t.id);
              const chatId = ClaudeUtils.extractChatId(t.url);
              const cleanTitle = ClaudeUtils.cleanTitle(t.title);
              const colorInfo = await ClaudeStorage.resolveColor(chatKey, cleanTitle);
              return {
                id: t.id,
                windowId: t.windowId,
                active: t.active,
                url: t.url,
                title: cleanTitle,
                chatId,
                chatKey,
                colorInfo
              };
            })
          );

          sendResponse({ success: true, tabs: tabsWithColor });
          break;
        }

        case 'SET_TAB_COLOR': {
          const { chatKey, hex } = message;
          if (!chatKey || !hex) {
            sendResponse({ success: false, error: 'Missing chatKey or hex' });
            return;
          }
          await ClaudeStorage.setCustomColor(chatKey, hex);
          // Broadcast to tabs and update badge
          await broadcastToClaudeTabs({ type: 'REFRESH_COLOR', chatKey, hex });

          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab) await updateBadgeForTab(activeTab);

          sendResponse({ success: true });
          break;
        }

        case 'RESET_TAB_COLOR': {
          const { chatKey } = message;
          if (!chatKey) {
            sendResponse({ success: false, error: 'Missing chatKey' });
            return;
          }
          await ClaudeStorage.removeCustomColor(chatKey);
          await broadcastToClaudeTabs({ type: 'REFRESH_COLOR', chatKey });

          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab) await updateBadgeForTab(activeTab);

          sendResponse({ success: true });
          break;
        }

        case 'CLEAR_ALL_COLORS': {
          await ClaudeStorage.clearAllCustomColors();
          await broadcastToClaudeTabs({ type: 'REFRESH_COLOR' });
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab) await updateBadgeForTab(activeTab);
          sendResponse({ success: true });
          break;
        }

        case 'SAVE_SETTINGS': {
          const updated = await ClaudeStorage.saveSettings(message.settings || {});
          await broadcastToClaudeTabs({ type: 'SETTINGS_UPDATED', settings: updated });
          sendResponse({ success: true, settings: updated });
          break;
        }

        case 'ACTIVATE_TAB': {
          const { tabId, windowId } = message;
          if (tabId) {
            await chrome.tabs.update(tabId, { active: true });
          }
          if (windowId) {
            await chrome.windows.update(windowId, { focused: true });
          }
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
          break;
      }
    } catch (err) {
      console.error('[ClaudeColorist] Service worker message error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  // Keep message channel open for async response
  return true;
});
