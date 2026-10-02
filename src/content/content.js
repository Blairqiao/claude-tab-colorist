/**
 * Claude Tab Colorist - Content Script
 * Injected on claude.ai pages to provide:
 * 1. Dynamic tab favicon tinting (instant visual differentiation in tab bar)
 * 2. Subtle top accent strip
 * 3. Minimal in-page header badge & quick color picker
 * 4. Automatic SPA route change detection
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.__CLAUDE_TAB_COLORIST_INJECTED__) return;
  window.__CLAUDE_TAB_COLORIST_INJECTED__ = true;

  // Local state
  let currentSettings = null;
  let currentColorInfo = null;
  let currentChatKey = null;
  let lastHref = window.location.href;
  let faviconObserver = null;
  let isUpdatingFavicon = false;

  /**
   * Initializes the content script.
   */
  async function init() {
    currentSettings = await ClaudeStorage.getSettings();
    await updateColorForCurrentPage();

    setupSpaNavigationListener();
    setupStorageListener();
    setupRuntimeMessageListener();
    setupFaviconObserver();

    // Re-check periodically for SPA transitions or DOM changes
    setInterval(checkRouteChanges, 1200);
  }

  /**
   * Evaluates the active chat ID / key and applies corresponding colors.
   */
  async function updateColorForCurrentPage() {
    const url = window.location.href;
    lastHref = url;
    currentChatKey = ClaudeUtils.getChatKey(url);
    const cleanTitle = ClaudeUtils.cleanTitle(document.title);

    currentColorInfo = await ClaudeStorage.resolveColor(currentChatKey, cleanTitle);

    applyThemeColors(currentColorInfo.hex);
    applyFavicon(currentColorInfo.hex);
    applyTopAccent();
    applyHeaderBadge();
    applyTabTitlePrefix();
  }

  /**
   * Sets CSS custom properties on document root.
   */
  function applyThemeColors(hex) {
    const root = document.documentElement;
    root.style.setProperty('--claude-tint-color', hex);
    root.style.setProperty('--claude-tint-color-subtle', ClaudeColors.hexToRgba(hex, 0.14));
    root.style.setProperty('--claude-tint-height', `${currentSettings?.accentHeight || 3}px`);
  }

  /* ==========================================================================
     1. Dynamic Favicon Generator & Updater
     ========================================================================== */

  /**
   * Generates a 32x32 canvas with Claude's starburst icon and chat color differentiation.
   */
  function renderFaviconDataUrl(hex, style = 'badge') {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    if (style === 'emblem') {
      // Full colored emblem style:
      // Rounded squircle background
      const r = size * 0.22;
      ctx.beginPath();
      ctx.roundRect(1, 1, size - 2, size - 2, r);
      ctx.fillStyle = '#1F1E1D';
      ctx.fill();

      // Render Claude starburst in custom color
      drawClaudeStarburst(ctx, cx, cy, size * 0.38, hex);
    } else {
      // Default Badge style:
      // Claude emblem in signature warm charcoal/terracotta
      const r = size * 0.22;
      ctx.beginPath();
      ctx.roundRect(1, 1, size - 2, size - 2, r);
      ctx.fillStyle = '#1E1E1C';
      ctx.fill();

      // Draw Claude starburst centered
      drawClaudeStarburst(ctx, cx, cy - 1, size * 0.32, '#FAF9F5');

      // Draw high-contrast notification-style color badge dot in bottom right
      const badgeX = size - 7.5;
      const badgeY = size - 7.5;
      const badgeRadius = 6;

      // Outer contrast ring
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1E1E1C';
      ctx.fill();

      // Inner color circle
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Helper to draw Claude's signature 6/8-point modulated starburst emblem on canvas.
   */
  function drawClaudeStarburst(ctx, cx, cy, radius, fillStyle) {
    ctx.save();
    ctx.beginPath();
    const points = 120;
    const petals = 6;

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      // Modulate radius with cosine waves to create Claude's petal rays
      const wave = (Math.cos(petals * angle) + 1.0) * 0.5;
      const r = radius * (0.32 + 0.68 * Math.pow(wave, 1.8));
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
  }

  /**
   * Applies the dynamic favicon to document.head.
   */
  function applyFavicon(hex) {
    if (!currentSettings || !currentSettings.tintFavicon) return;

    try {
      isUpdatingFavicon = true;
      const dataUrl = renderFaviconDataUrl(hex, currentSettings.faviconStyle || 'badge');
      if (!dataUrl) return;

      // Remove or update existing icons
      let iconLink = document.querySelector('link[rel~="icon"]');
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        iconLink.type = 'image/png';
        document.head.appendChild(iconLink);
      }
      iconLink.type = 'image/png';
      iconLink.href = dataUrl;
    } finally {
      setTimeout(() => {
        isUpdatingFavicon = false;
      }, 50);
    }
  }

  /**
   * Guards against Claude's SPA router rewriting our favicon.
   */
  function setupFaviconObserver() {
    if (faviconObserver) faviconObserver.disconnect();

    const debouncedRestore = ClaudeUtils.debounce(() => {
      if (isUpdatingFavicon || !currentColorInfo) return;
      applyFavicon(currentColorInfo.hex);
    }, 200);

    faviconObserver = new MutationObserver((mutations) => {
      if (isUpdatingFavicon) return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            if (node.nodeName === 'LINK' && node.rel && node.rel.includes('icon')) {
              if (!node.href.startsWith('data:image/png')) {
                debouncedRestore();
                return;
              }
            }
          }
        } else if (m.type === 'attributes' && m.attributeName === 'href') {
          if (m.target.nodeName === 'LINK' && m.target.rel && m.target.rel.includes('icon')) {
            if (!m.target.href.startsWith('data:image/png')) {
              debouncedRestore();
              return;
            }
          }
        }
      }
    });

    if (document.head) {
      faviconObserver.observe(document.head, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'rel']
      });
    }
  }

  /* ==========================================================================
     2. Top Accent Strip
     ========================================================================== */

  function applyTopAccent() {
    let strip = document.getElementById('claude-tint-accent-strip');
    const enabled = currentSettings?.showTopAccent !== false;

    if (!enabled) {
      if (strip) strip.style.display = 'none';
      return;
    }

    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'claude-tint-accent-strip';
      const mountPoint = document.body || document.documentElement;
      if (mountPoint) {
        mountPoint.appendChild(strip);
      }
    }
    strip.style.display = 'block';
  }

  /* ==========================================================================
     3. In-Page Header Badge & Mini Popover Picker
     ========================================================================== */

  function applyHeaderBadge() {
    if (!currentSettings?.showInPageBadge) {
      const existing = document.getElementById('claude-tint-header-badge');
      if (existing) existing.remove();
      return;
    }

    let badge = document.getElementById('claude-tint-header-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'claude-tint-header-badge';
      badge.setAttribute('role', 'button');
      badge.setAttribute('aria-expanded', 'false');
      badge.setAttribute('title', 'Claude Chat Color - Click to change');

      badge.innerHTML = `
        <span class="claude-tint-dot"></span>
        <span class="claude-tint-label"></span>
        <svg class="claude-tint-chevron" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        <div id="claude-tint-popover"></div>
      `;

      badge.addEventListener('click', (e) => {
        // Toggle popover unless clicking inside the popover itself
        const popover = document.getElementById('claude-tint-popover');
        if (popover && popover.contains(e.target)) return;
        e.stopPropagation();
        togglePopover();
      });

      // Close popover when clicking anywhere outside
      document.addEventListener('click', (e) => {
        const popover = document.getElementById('claude-tint-popover');
        if (badge && !badge.contains(e.target)) {
          closePopover();
        }
      });

      mountBadge(badge);
      buildPopoverContent();
    }

    // Update label and color
    const labelEl = badge.querySelector('.claude-tint-label');
    if (labelEl && currentColorInfo) {
      labelEl.textContent = currentColorInfo.name;
    }

    updatePopoverActiveSwatch();
  }

  /**
   * Mounts the badge into Claude's header navigation or falls back to floating.
   */
  function mountBadge(badge) {
    // Try to find Claude's header or model title container
    const headerSelectors = [
      'header [data-testid="chat-header"]',
      'header [data-testid="header-model-selector"]',
      'header .flex.items-center',
      'header',
      '[role="banner"]'
    ];

    let targetContainer = null;
    for (const sel of headerSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        targetContainer = el;
        break;
      }
    }

    if (targetContainer && currentSettings?.badgePosition !== 'floating') {
      badge.classList.remove('claude-tint-floating');
      targetContainer.appendChild(badge);
    } else {
      // Floating pill in bottom right
      badge.classList.add('claude-tint-floating');
      (document.body || document.documentElement).appendChild(badge);
    }
  }

  /**
   * Builds the interactive color picker inside the popover.
   */
  function buildPopoverContent() {
    const popover = document.getElementById('claude-tint-popover');
    if (!popover) return;

    popover.innerHTML = `
      <div class="claude-tint-popover-header">
        <span class="claude-tint-popover-title">Chat Color</span>
        <span class="claude-tint-popover-status">${currentColorInfo?.isCustom ? 'Custom' : 'Auto'}</span>
      </div>
      <div class="claude-tint-grid">
        ${ClaudeColors.PRESET_COLORS.map(
          (p) => `
          <button type="button" class="claude-tint-swatch" data-hex="${p.hex}" title="${p.name}" style="background-color: ${p.hex};"></button>
        `
        ).join('')}
      </div>
      <div class="claude-tint-custom-row">
        <div class="claude-tint-color-input-wrapper">
          <input type="color" class="claude-tint-color-input" value="${currentColorInfo?.hex || '#CC785C'}" />
        </div>
        <input type="text" class="claude-tint-hex-text" value="${currentColorInfo?.hex || '#CC785C'}" maxlength="7" spellcheck="false" />
      </div>
      <div class="claude-tint-actions">
        <button type="button" class="claude-tint-btn-subtle" id="claude-tint-reset-btn">Reset to Auto</button>
        <button type="button" class="claude-tint-btn-subtle" id="claude-tint-more-btn">More options</button>
      </div>
    `;

    // Event: Swatch clicks
    popover.querySelectorAll('.claude-tint-swatch').forEach((swatch) => {
      swatch.addEventListener('click', async (e) => {
        e.stopPropagation();
        const hex = swatch.getAttribute('data-hex');
        await assignColor(hex);
      });
    });

    // Event: Native Color Input
    const colorInput = popover.querySelector('.claude-tint-color-input');
    const hexInput = popover.querySelector('.claude-tint-hex-text');

    if (colorInput && hexInput) {
      colorInput.addEventListener('input', (e) => {
        hexInput.value = e.target.value.toUpperCase();
      });
      colorInput.addEventListener('change', async (e) => {
        await assignColor(e.target.value);
      });

      hexInput.addEventListener('change', async (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          colorInput.value = val;
          await assignColor(val);
        }
      });
    }

    // Event: Reset to Auto
    const resetBtn = popover.querySelector('#claude-tint-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await resetToAuto();
      });
    }

    // Event: More options (open Chrome extension popup or notify)
    const moreBtn = popover.querySelector('#claude-tint-more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        alert('To customize tabs, favicons, and accent options, click the Claude Tab Colorist icon in your browser toolbar.');
      });
    }
  }

  function togglePopover() {
    const popover = document.getElementById('claude-tint-popover');
    const badge = document.getElementById('claude-tint-header-badge');
    if (!popover || !badge) return;

    const isOpen = popover.classList.contains('claude-tint-open');
    if (isOpen) {
      closePopover();
    } else {
      buildPopoverContent();
      popover.classList.add('claude-tint-open');
      badge.setAttribute('aria-expanded', 'true');
    }
  }

  function closePopover() {
    const popover = document.getElementById('claude-tint-popover');
    const badge = document.getElementById('claude-tint-header-badge');
    if (popover) popover.classList.remove('claude-tint-open');
    if (badge) badge.setAttribute('aria-expanded', 'false');
  }

  function updatePopoverActiveSwatch() {
    const popover = document.getElementById('claude-tint-popover');
    if (!popover || !currentColorInfo) return;

    popover.querySelectorAll('.claude-tint-swatch').forEach((swatch) => {
      const hex = swatch.getAttribute('data-hex');
      if (hex && hex.toLowerCase() === currentColorInfo.hex.toLowerCase()) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });

    const statusEl = popover.querySelector('.claude-tint-popover-status');
    if (statusEl) {
      statusEl.textContent = currentColorInfo.isCustom ? 'Custom' : 'Auto';
    }
  }

  /**
   * Sets custom color for current chat.
   */
  async function assignColor(hex) {
    if (!currentChatKey) {
      currentChatKey = ClaudeUtils.getChatKey(window.location.href);
    }
    await ClaudeStorage.setCustomColor(currentChatKey, hex);
    await updateColorForCurrentPage();
    closePopover();
  }

  /**
   * Resets color to auto-assigned seed.
   */
  async function resetToAuto() {
    if (currentChatKey) {
      await ClaudeStorage.removeCustomColor(currentChatKey);
    }
    await updateColorForCurrentPage();
    closePopover();
  }

  /* ==========================================================================
     4. Tab Title Prefix
     ========================================================================== */

  function applyTabTitlePrefix() {
    if (!currentSettings?.prefixTabTitle || !currentColorInfo) return;
    const bullet = '● ';
    if (!document.title.startsWith(bullet)) {
      document.title = bullet + ClaudeUtils.cleanTitle(document.title) + ' - Claude';
    }
  }

  /* ==========================================================================
     5. SPA Navigation & Event Listeners
     ========================================================================== */

  function checkRouteChanges() {
    const currentHref = window.location.href;
    if (currentHref !== lastHref) {
      updateColorForCurrentPage();
    }
    // Also re-mount badge if Claude redrew header
    if (currentSettings?.showInPageBadge) {
      const badge = document.getElementById('claude-tint-header-badge');
      if (!badge || !document.contains(badge)) {
        applyHeaderBadge();
      }
    }
  }

  function setupSpaNavigationListener() {
    // Intercept pushState & replaceState
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    history.pushState = function (...args) {
      const ret = originalPush.apply(this, args);
      setTimeout(updateColorForCurrentPage, 50);
      return ret;
    };

    history.replaceState = function (...args) {
      const ret = originalReplace.apply(this, args);
      setTimeout(updateColorForCurrentPage, 50);
      return ret;
    };

    window.addEventListener('popstate', () => {
      setTimeout(updateColorForCurrentPage, 50);
    });
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' || areaName === 'local') {
        setTimeout(async () => {
          currentSettings = await ClaudeStorage.getSettings();
          await updateColorForCurrentPage();
        }, 50);
      }
    });
  }

  function setupRuntimeMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'REFRESH_COLOR' || message.type === 'SETTINGS_UPDATED') {
        (async () => {
          currentSettings = await ClaudeStorage.getSettings();
          await updateColorForCurrentPage();
          sendResponse({ success: true });
        })();
        return true;
      }
    });
  }

  // Run on start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
