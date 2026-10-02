/**
 * Claude Tab Colorist - Storage Manager
 * Uses chrome.storage.sync with graceful fallback to chrome.storage.local.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const ClaudeColors = require('./colors.js');
    const ClaudeUtils = require('./utils.js');
    module.exports = factory(ClaudeColors, ClaudeUtils);
  } else {
    root.ClaudeStorage = factory(root.ClaudeColors, root.ClaudeUtils);
  }
})(typeof self !== 'undefined' ? self : this, function (ClaudeColors, ClaudeUtils) {
  'use strict';

  const DEFAULT_SETTINGS = {
    tintFavicon: true,
    faviconStyle: 'badge', // 'badge' (Claude emblem with colored badge) or 'emblem' (full colored Claude emblem)
    showTopAccent: true,
    accentHeight: 3, // in pixels (2, 3, 4, 6)
    showInPageBadge: true,
    badgePosition: 'header', // 'header' or 'floating'
    prefixTabTitle: false,
    autoAssignColors: true
  };

  const STORAGE_KEYS = {
    SETTINGS: 'claude_colorist_settings',
    CUSTOM_COLORS: 'claude_colorist_custom_colors',
    TAB_OVERRIDES: 'claude_colorist_tab_overrides'
  };

  /**
   * Helper to access storage area (sync with local fallback).
   */
  function getStorageArea() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return chrome.storage.sync || chrome.storage.local;
    }
    return null;
  }

  /**
   * Safe getter from chrome storage.
   */
  async function storageGet(keys) {
    const area = getStorageArea();
    if (!area) return {};
    try {
      return await area.get(keys);
    } catch (err) {
      console.warn('[ClaudeColorist] Storage sync read failed, falling back to local:', err);
      try {
        if (chrome.storage.local) {
          return await chrome.storage.local.get(keys);
        }
      } catch (localErr) {
        console.error('[ClaudeColorist] Storage local read failed:', localErr);
      }
      return {};
    }
  }

  /**
   * Safe setter to chrome storage.
   */
  async function storageSet(items) {
    const area = getStorageArea();
    if (!area) return;
    try {
      await area.set(items);
    } catch (err) {
      console.warn('[ClaudeColorist] Storage sync write failed, falling back to local:', err);
      try {
        if (chrome.storage.local) {
          await chrome.storage.local.set(items);
        }
      } catch (localErr) {
        console.error('[ClaudeColorist] Storage local write failed:', localErr);
      }
    }
  }

  /**
   * Loads user settings merged with defaults.
   */
  async function getSettings() {
    const res = await storageGet(STORAGE_KEYS.SETTINGS);
    const stored = res[STORAGE_KEYS.SETTINGS] || {};
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  /**
   * Saves partial settings updates.
   */
  async function saveSettings(partial) {
    const current = await getSettings();
    const updated = { ...current, ...partial };
    await storageSet({ [STORAGE_KEYS.SETTINGS]: updated });
    return updated;
  }

  /**
   * Gets all custom color assignments: { [chatKey]: hexString }.
   */
  async function getCustomColors() {
    const res = await storageGet(STORAGE_KEYS.CUSTOM_COLORS);
    return res[STORAGE_KEYS.CUSTOM_COLORS] || {};
  }

  /**
   * Sets custom color for a specific chatKey (e.g. "chat:123" or "tab:456").
   */
  async function setCustomColor(chatKey, hex) {
    if (!chatKey || !hex) return;
    const colors = await getCustomColors();
    colors[chatKey] = hex;
    await storageSet({ [STORAGE_KEYS.CUSTOM_COLORS]: colors });
    return colors;
  }

  /**
   * Removes custom color override for a chatKey (reverting to auto).
   */
  async function removeCustomColor(chatKey) {
    if (!chatKey) return;
    const colors = await getCustomColors();
    if (chatKey in colors) {
      delete colors[chatKey];
      await storageSet({ [STORAGE_KEYS.CUSTOM_COLORS]: colors });
    }
    return colors;
  }

  /**
   * Clears all custom color assignments.
   */
  async function clearAllCustomColors() {
    await storageSet({ [STORAGE_KEYS.CUSTOM_COLORS]: {} });
    return {};
  }

  /**
   * Resolves the effective color for a given chat key and context.
   * Priority:
   *   1. Explicit custom color saved for chatKey
   *   2. Automatic deterministic color hashed from chatKey / fallbackText
   *   3. Default Claude terracotta color
   */
  async function resolveColor(chatKey, fallbackText = '') {
    const settings = await getSettings();
    const customColors = await getCustomColors();

    if (chatKey && customColors[chatKey]) {
      const hex = customColors[chatKey];
      return {
        hex,
        isCustom: true,
        name: ClaudeColors.getColorName(hex),
        preset: ClaudeColors.findPreset(hex)
      };
    }

    if (settings.autoAssignColors) {
      const seed = chatKey || fallbackText || 'claude-chat';
      const preset = ClaudeColors.hashStringToColor(seed);
      return {
        hex: preset.hex,
        isCustom: false,
        name: preset.name,
        preset
      };
    }

    const defaultPreset = ClaudeColors.PRESET_COLORS[0];
    return {
      hex: defaultPreset.hex,
      isCustom: false,
      name: defaultPreset.name,
      preset: defaultPreset
    };
  }

  return {
    DEFAULT_SETTINGS,
    STORAGE_KEYS,
    getSettings,
    saveSettings,
    getCustomColors,
    setCustomColor,
    removeCustomColor,
    clearAllCustomColors,
    resolveColor
  };
});
