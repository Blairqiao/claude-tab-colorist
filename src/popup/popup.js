/**
 * Claude Tab Colorist - Popup Controller
 * Manages active tab status, color selection, open tabs list, and preferences.
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // DOM Elements - Main View
  const mainView = document.getElementById('main-view');
  const settingsView = document.getElementById('settings-view');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');

  // Active Chat Card
  const chatCard = document.getElementById('chat-card');
  const nonClaudeNotice = document.getElementById('non-claude-notice');
  const currentColorBubble = document.getElementById('current-color-bubble');
  const chatStatusBadge = document.getElementById('chat-status-badge');
  const chatTitle = document.getElementById('chat-title');
  const chatIdTag = document.getElementById('chat-id-tag');
  const paletteColorName = document.getElementById('palette-color-name');
  const swatchesGrid = document.getElementById('swatches-grid');
  const nativeColorPicker = document.getElementById('native-color-picker');
  const pickerSwatchPreview = document.getElementById('picker-swatch-preview');
  const hexInput = document.getElementById('hex-input');
  const applyCustomBtn = document.getElementById('apply-custom-btn');
  const resetColorBtn = document.getElementById('reset-color-btn');

  // Open Tabs Section
  const openTabsContainer = document.getElementById('open-tabs-container');
  const tabsCount = document.getElementById('tabs-count');

  // Settings Elements
  const settingTintFavicon = document.getElementById('setting-tint-favicon');
  const settingFaviconStyle = document.getElementById('setting-favicon-style');
  const settingTopAccent = document.getElementById('setting-top-accent');
  const settingAccentStyle = document.getElementById('setting-accent-style');
  const settingGlowIntensity = document.getElementById('setting-glow-intensity');
  const settingAccentHeight = document.getElementById('setting-accent-height');
  const settingInpageBadge = document.getElementById('setting-inpage-badge');
  const settingPrefixTitle = document.getElementById('setting-prefix-title');
  const clearAllColorsBtn = document.getElementById('clear-all-colors-btn');

  // Toast
  const toast = document.getElementById('toast');

  // State
  let currentTabStatus = null;
  let allClaudeTabs = [];
  let currentSettings = null;

  /**
   * Initializes the popup data and UI.
   */
  async function init() {
    renderSwatchesGrid();
    setupEventListeners();
    await refreshData();
  }

  /**
   * Renders the 16 preset color swatches in the grid.
   */
  function renderSwatchesGrid() {
    swatchesGrid.innerHTML = '';
    ClaudeColors.PRESET_COLORS.forEach((color) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch-btn';
      btn.style.backgroundColor = color.hex;
      btn.title = `${color.name} (${color.hex})`;
      btn.setAttribute('data-hex', color.hex);
      btn.setAttribute('data-name', color.name);

      btn.addEventListener('click', async () => {
        await handleColorSelect(color.hex, color.name);
      });

      btn.addEventListener('mouseenter', () => {
        paletteColorName.textContent = color.name;
      });

      btn.addEventListener('mouseleave', () => {
        if (currentTabStatus && currentTabStatus.colorInfo) {
          paletteColorName.textContent = currentTabStatus.colorInfo.name;
        }
      });

      swatchesGrid.appendChild(btn);
    });
  }

  /**
   * Refreshes active tab status and open tabs list from background worker.
   */
  async function refreshData() {
    try {
      // 1. Get current active tab status
      currentTabStatus = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_STATUS' });
      currentSettings = currentTabStatus?.settings || (await ClaudeStorage.getSettings());

      // 2. Get all open Claude tabs
      const tabsResponse = await chrome.runtime.sendMessage({ type: 'GET_ALL_CLAUDE_TABS' });
      allClaudeTabs = (tabsResponse && tabsResponse.tabs) || [];

      // 3. Update UI
      updateActiveTabUI();
      renderOpenTabsList();
      syncSettingsUI();
    } catch (err) {
      console.error('[ClaudeColorist] Failed to refresh data:', err);
    }
  }

  /**
   * Updates the Active Claude Chat card with current tab's info.
   */
  function updateActiveTabUI() {
    if (!currentTabStatus || !currentTabStatus.isClaude) {
      // Current tab is not on Claude
      chatCard.style.display = 'none';
      nonClaudeNotice.style.display = 'flex';
      return;
    }

    chatCard.style.display = 'block';
    nonClaudeNotice.style.display = 'none';

    const info = currentTabStatus.colorInfo;
    const hex = info?.hex || '#CC785C';
    const name = info?.name || ClaudeColors.getColorName(hex);

    // Update headers and badges
    chatTitle.textContent = currentTabStatus.cleanTitle || 'Claude Chat';
    chatTitle.title = currentTabStatus.cleanTitle || '';
    chatIdTag.textContent = currentTabStatus.chatKey || 'claude.ai';

    currentColorBubble.style.backgroundColor = hex;
    paletteColorName.textContent = name;
    hexInput.value = hex.toUpperCase();
    nativeColorPicker.value = hex;

    if (info?.isCustom) {
      chatStatusBadge.textContent = 'Custom Color';
      chatStatusBadge.style.color = hex;
      chatStatusBadge.style.backgroundColor = ClaudeColors.hexToRgba(hex, 0.15);
      resetColorBtn.style.display = 'inline-block';
    } else {
      chatStatusBadge.textContent = 'Auto Assigned';
      chatStatusBadge.style.color = '#73726C';
      chatStatusBadge.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      resetColorBtn.style.display = 'none';
    }

    // Highlight active swatch in grid
    highlightActiveSwatch(hex);
  }

  /**
   * Highlights the active color swatch in the preset grid.
   */
  function highlightActiveSwatch(activeHex) {
    const swatches = swatchesGrid.querySelectorAll('.swatch-btn');
    swatches.forEach((swatch) => {
      const hex = swatch.getAttribute('data-hex');
      if (hex && hex.toLowerCase() === activeHex.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
  }

  /**
   * Renders the list of all currently open Claude tabs.
   */
  function renderOpenTabsList() {
    tabsCount.textContent = allClaudeTabs.length;

    if (allClaudeTabs.length === 0) {
      openTabsContainer.innerHTML = '<div class="empty-tabs-notice">No active Claude tabs open.</div>';
      return;
    }

    openTabsContainer.innerHTML = '';
    allClaudeTabs.forEach((tab) => {
      const item = document.createElement('div');
      item.className = `tab-item ${tab.active ? 'active' : ''}`;
      item.title = `Switch to: ${tab.title}`;

      const colorHex = tab.colorInfo?.hex || '#CC785C';
      const colorName = tab.colorInfo?.name || 'Color';

      item.innerHTML = `
        <span class="tab-dot" style="background-color: ${colorHex};"></span>
        <div class="tab-info">
          <div class="tab-name">${escapeHtml(tab.title)}</div>
          <div class="tab-color-tag">${colorName}${tab.colorInfo?.isCustom ? ' (Custom)' : ''}</div>
        </div>
        <div class="tab-action-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      `;

      item.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({
          type: 'ACTIVATE_TAB',
          tabId: tab.id,
          windowId: tab.windowId
        });
        window.close(); // Close popup after switching
      });

      openTabsContainer.appendChild(item);
    });
  }

  /**
   * Handles selecting a color (either via preset or custom input).
   */
  async function handleColorSelect(hex, name) {
    if (!currentTabStatus || !currentTabStatus.chatKey) {
      showToast('Please open or focus a Claude tab first');
      return;
    }

    await chrome.runtime.sendMessage({
      type: 'SET_TAB_COLOR',
      chatKey: currentTabStatus.chatKey,
      hex
    });

    showToast(`Assigned ${name || hex} to this chat`);
    await refreshData();
  }

  /**
   * Handles resetting to the auto-deterministic color.
   */
  async function handleColorReset() {
    if (!currentTabStatus || !currentTabStatus.chatKey) return;

    await chrome.runtime.sendMessage({
      type: 'RESET_TAB_COLOR',
      chatKey: currentTabStatus.chatKey
    });

    showToast('Reset to automatic chat color');
    await refreshData();
  }

  /**
   * Synchronizes settings form fields with current settings.
   */
  function syncSettingsUI() {
    if (!currentSettings) return;
    settingTintFavicon.checked = currentSettings.tintFavicon !== false;
    settingFaviconStyle.value = currentSettings.faviconStyle || 'badge';
    settingTopAccent.checked = currentSettings.showTopAccent !== false;
    if (settingAccentStyle) settingAccentStyle.value = currentSettings.accentStyle || 'glow';
    if (settingGlowIntensity) settingGlowIntensity.value = currentSettings.glowIntensity || 'medium';
    settingAccentHeight.value = String(currentSettings.accentHeight || 4);
    settingInpageBadge.checked = currentSettings.showInPageBadge !== false;
    settingPrefixTitle.checked = currentSettings.prefixTabTitle === true;
  }

  /**
   * Saves updated settings from preferences screen.
   */
  async function saveUpdatedSettings() {
    const updated = {
      tintFavicon: settingTintFavicon.checked,
      faviconStyle: settingFaviconStyle.value,
      showTopAccent: settingTopAccent.checked,
      accentStyle: settingAccentStyle ? settingAccentStyle.value : 'glow',
      glowIntensity: settingGlowIntensity ? settingGlowIntensity.value : 'medium',
      accentHeight: parseInt(settingAccentHeight.value, 10) || 4,
      showInPageBadge: settingInpageBadge.checked,
      prefixTabTitle: settingPrefixTitle.checked
    };

    const res = await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: updated
    });

    currentSettings = res?.settings || updated;
    showToast('Preferences saved');
  }

  /**
   * Wire up all UI event listeners.
   */
  function setupEventListeners() {
    // Native color picker
    nativeColorPicker.addEventListener('input', (e) => {
      hexInput.value = e.target.value.toUpperCase();
      paletteColorName.textContent = e.target.value.toUpperCase();
    });

    nativeColorPicker.addEventListener('change', async (e) => {
      await handleColorSelect(e.target.value, e.target.value.toUpperCase());
    });

    // Custom HEX apply
    applyCustomBtn.addEventListener('click', async () => {
      let val = hexInput.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        nativeColorPicker.value = val;
        await handleColorSelect(val, val.toUpperCase());
      } else {
        showToast('Please enter a valid 6-character hex code (e.g. #CC785C)');
      }
    });

    hexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        applyCustomBtn.click();
      }
    });

    // Reset button
    resetColorBtn.addEventListener('click', handleColorReset);

    // Settings Navigation
    openSettingsBtn.addEventListener('click', () => {
      mainView.style.display = 'none';
      settingsView.style.display = 'flex';
      syncSettingsUI();
    });

    closeSettingsBtn.addEventListener('click', () => {
      settingsView.style.display = 'none';
      mainView.style.display = 'flex';
    });

    // Settings Inputs Auto-Save
    [
      settingTintFavicon,
      settingFaviconStyle,
      settingTopAccent,
      settingAccentStyle,
      settingGlowIntensity,
      settingAccentHeight,
      settingInpageBadge,
      settingPrefixTitle
    ].filter(Boolean).forEach((el) => {
      el.addEventListener('change', saveUpdatedSettings);
    });

    // Clear All Custom Colors
    clearAllColorsBtn.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure you want to clear all custom color overrides? Every Claude chat will revert to its auto-assigned color.');
      if (confirmed) {
        await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_COLORS' });
        showToast('All custom colors cleared');
        await refreshData();
      }
    });

    // Export Colors
    const exportBtn = document.getElementById('export-colors-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const customColors = await ClaudeStorage.getCustomColors();
        const settings = await ClaudeStorage.getSettings();
        const exportData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          settings,
          customColors
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claude-tab-colors-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Exported custom colors to JSON');
      });
    }

    // Import Colors
    const importBtn = document.getElementById('import-colors-btn');
    const importFileInput = document.getElementById('import-file-input');
    if (importBtn && importFileInput) {
      importBtn.addEventListener('click', () => {
        importFileInput.click();
      });

      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.customColors && typeof data.customColors === 'object') {
              for (const [key, hex] of Object.entries(data.customColors)) {
                if (typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex)) {
                  await ClaudeStorage.setCustomColor(key, hex);
                }
              }
              if (data.settings && typeof data.settings === 'object') {
                await ClaudeStorage.saveSettings(data.settings);
              }
              showToast('Imported colors successfully!');
              await refreshData();
            } else {
              showToast('Invalid color backup file format');
            }
          } catch (err) {
            console.error('Import failed:', err);
            showToast('Failed to parse JSON file');
          } finally {
            importFileInput.value = '';
          }
        };
        reader.readAsText(file);
      });
    }
  }

  /**
   * Shows a brief toast alert at bottom of popup.
   */
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  /**
   * Safe HTML escaping
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run initialization
  await init();
});
