/**
 * Claude Tab Colorist - Content Script
 * Injected on claude.ai pages to provide:
 * 1. Dynamic tab favicon tinting (instant visual differentiation in tab bar)
 * 2. Subtle top accent strip with atmospheric canopy glow
 * 3. Minimal in-page header badge & viewport-aware quick color picker
 * 4. Zero-latency synchronous route transition handling
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.__CLAUDE_TAB_COLORIST_INJECTED__) return;
  window.__CLAUDE_TAB_COLORIST_INJECTED__ = true;

  // In-memory synchronous state cache for zero-latency color resolution
  let cachedSettings = { ...ClaudeStorage.DEFAULT_SETTINGS };
  let cachedCustomColors = {};
  let isCacheReady = false;

  // Local state
  let currentColorInfo = null;
  let currentChatKey = null;
  let lastHref = window.location.href;
  let faviconObserver = null;
  let isUpdatingFavicon = false;

  /**
   * Initializes the content script.
   */
  async function init() {
    // 1. Preload storage caches for synchronous resolution
    try {
      const [settings, customColors] = await Promise.all([
        ClaudeStorage.getSettings(),
        ClaudeStorage.getCustomColors()
      ]);
      cachedSettings = settings || cachedSettings;
      cachedCustomColors = customColors || {};
      isCacheReady = true;
    } catch (err) {
      console.warn('[ClaudeColorist] Cache preload warning:', err);
    }

    // 2. Apply colors immediately to active page
    applyColorImmediately(window.location.href);

    // 3. Setup event listeners
    setupSpaNavigationListener();
    setupStorageListener();
    setupRuntimeMessageListener();
    setupFaviconObserver();
    setupWindowRepositionListeners();

    // 4. Fallback interval for DOM re-renders by React
    setInterval(checkRouteChanges, 1200);
  }

  /**
   * Immediate synchronous color resolution & DOM update.
   * Runs in 0ms with zero IPC delay.
   */
  function applyColorImmediately(url, fallbackTitle) {
    lastHref = url;
    currentChatKey = ClaudeUtils.getChatKey(url);
    const cleanTitle = fallbackTitle || ClaudeUtils.cleanTitle(document.title);

    currentColorInfo = ClaudeStorage.resolveColorSync(
      currentChatKey,
      cachedCustomColors,
      cachedSettings.autoAssignColors !== false,
      cleanTitle
    );

    // Apply CSS variables and visual DOM elements synchronously
    applyThemeColors(currentColorInfo.hex);
    applyTopAccent();
    applyHeaderBadge();
    applyFavicon(currentColorInfo.hex);
    applyTabTitlePrefix();
  }

  /**
   * Sets CSS custom properties on document root.
   */
  function applyThemeColors(hex) {
    const root = document.documentElement;
    root.style.setProperty('--claude-tint-color', hex);
    root.style.setProperty('--claude-tint-color-subtle', ClaudeColors.hexToRgba(hex, 0.12));

    // Glow opacity based on intensity setting
    const intensity = cachedSettings.glowIntensity || 'medium';
    const glowAlpha = intensity === 'soft' ? 0.14 : intensity === 'vibrant' ? 0.32 : 0.22;
    root.style.setProperty('--claude-tint-glow', ClaudeColors.hexToRgba(hex, glowAlpha));
    root.style.setProperty('--claude-tint-border', ClaudeColors.hexToRgba(hex, 0.35));
    root.style.setProperty('--claude-tint-height', `${cachedSettings?.accentHeight || 4}px`);

    // Apply style variations to root HTML element
    root.classList.remove(
      'claude-tint-style-glow',
      'claude-tint-style-bold',
      'claude-tint-style-subtle',
      'claude-tint-style-header-tint'
    );
    const styleClass = `claude-tint-style-${cachedSettings?.accentStyle || 'glow'}`;
    root.classList.add(styleClass);
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
      // Full colored emblem style
      const r = size * 0.22;
      ctx.beginPath();
      ctx.roundRect(1, 1, size - 2, size - 2, r);
      ctx.fillStyle = '#1F1E1D';
      ctx.fill();

      // Render Claude starburst in custom color
      drawClaudeStarburst(ctx, cx, cy, size * 0.38, hex);
    } else {
      // Default Badge style: Claude emblem with color notification dot
      const r = size * 0.22;
      ctx.beginPath();
      ctx.roundRect(1, 1, size - 2, size - 2, r);
      ctx.fillStyle = '#1E1E1C';
      ctx.fill();

      drawClaudeStarburst(ctx, cx, cy - 1, size * 0.32, '#FAF9F5');

      const badgeX = size - 7.5;
      const badgeY = size - 7.5;
      const badgeRadius = 6;

      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1E1E1C';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
    }

    return canvas.toDataURL('image/png');
  }

  function drawClaudeStarburst(ctx, cx, cy, radius, fillStyle) {
    ctx.save();
    ctx.beginPath();
    const points = 120;
    const petals = 6;

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
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

  function applyFavicon(hex) {
    if (!cachedSettings || !cachedSettings.tintFavicon) return;

    try {
      isUpdatingFavicon = true;
      const dataUrl = renderFaviconDataUrl(hex, cachedSettings.faviconStyle || 'badge');
      if (!dataUrl) return;

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

  function setupFaviconObserver() {
    if (faviconObserver) faviconObserver.disconnect();

    const debouncedRestore = ClaudeUtils.debounce(() => {
      if (isUpdatingFavicon || !currentColorInfo) return;
      applyFavicon(currentColorInfo.hex);
    }, 150);

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
     2. Top Accent Strip & Atmospheric Canopy Glow
     ========================================================================== */

  function applyTopAccent() {
    let strip = document.getElementById('claude-tint-accent-strip');
    const enabled = cachedSettings?.showTopAccent !== false;

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
     3. In-Page Header Badge & Viewport-Aware Mini Popover Picker
     ========================================================================== */

  function applyHeaderBadge() {
    if (!cachedSettings?.showInPageBadge) {
      const existing = document.getElementById('claude-tint-header-badge');
      if (existing) existing.remove();
      closePopover();
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
      `;

      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover();
      });

      // Close popover when clicking anywhere outside
      document.addEventListener('click', (e) => {
        const popover = document.getElementById('claude-tint-popover');
        if (popover && !popover.contains(e.target) && !badge.contains(e.target)) {
          closePopover();
        }
      });

      mountBadge(badge);
    }

    // Update label text
    const labelEl = badge.querySelector('.claude-tint-label');
    if (labelEl && currentColorInfo) {
      labelEl.textContent = currentColorInfo.name;
    }

    // If popover is already open, keep active swatch updated
    updatePopoverActiveSwatch();
    positionPopover();
  }

  /**
   * Mounts the badge into Claude's header or floats in corner.
   */
  function mountBadge(badge) {
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

    if (targetContainer && cachedSettings?.badgePosition !== 'floating') {
      badge.classList.remove('claude-tint-floating');
      targetContainer.appendChild(badge);
    } else {
      badge.classList.add('claude-tint-floating');
      (document.body || document.documentElement).appendChild(badge);
    }
  }

  /**
   * Creates or gets the popover element mounted directly on document.body.
   * This guarantees it is never clipped by Claude's headers or overflow parents.
   */
  function getOrCreatePopover() {
    let popover = document.getElementById('claude-tint-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'claude-tint-popover';
      document.body.appendChild(popover);

      // Stop clicks inside popover from closing it
      popover.addEventListener('click', (e) => e.stopPropagation());
    }
    return popover;
  }

  /**
   * Dynamically positions the popover relative to the badge with boundary clamping.
   * Solves Bug 1: Never out-of-bounds, even when the badge starts at the top-right corner.
   */
  function positionPopover() {
    const badge = document.getElementById('claude-tint-header-badge');
    const popover = document.getElementById('claude-tint-popover');
    if (!badge || !popover || !popover.classList.contains('claude-tint-open')) return;

    const badgeRect = badge.getBoundingClientRect();
    const popoverWidth = 260;
    const popoverHeight = 310;
    const padding = 12;

    // Horizontal positioning:
    // If opening from the badge's left edge causes an overflow to the right of the window,
    // align to the badge's right edge instead.
    let left = badgeRect.left;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = badgeRect.right - popoverWidth;
    }
    // Strict boundary clamping so popover stays 100% on-screen
    left = Math.max(padding, Math.min(window.innerWidth - popoverWidth - padding, left));

    // Vertical positioning:
    // If opening down causes bottom overflow, flip to open above the badge
    let top = badgeRect.bottom + 8;
    if (top + popoverHeight > window.innerHeight - padding) {
      if (badgeRect.top - popoverHeight - 8 > padding) {
        top = badgeRect.top - popoverHeight - 8;
      } else {
        top = Math.max(padding, window.innerHeight - popoverHeight - padding);
      }
    }

    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  function setupWindowRepositionListeners() {
    window.addEventListener('resize', positionPopover, { passive: true });
    window.addEventListener('scroll', positionPopover, { capture: true, passive: true });
  }

  /**
   * Builds the interactive color picker inside the popover.
   */
  function buildPopoverContent() {
    const popover = getOrCreatePopover();

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

    // Event: More options
    const moreBtn = popover.querySelector('#claude-tint-more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        alert('To customize tabs, favicons, canopy glow, and accent options, click the Claude Tab Colorist icon in your browser toolbar.');
      });
    }
  }

  function togglePopover() {
    const popover = getOrCreatePopover();
    const badge = document.getElementById('claude-tint-header-badge');
    if (!badge) return;

    const isOpen = popover.classList.contains('claude-tint-open');
    if (isOpen) {
      closePopover();
    } else {
      buildPopoverContent();
      popover.classList.add('claude-tint-open');
      badge.setAttribute('aria-expanded', 'true');
      positionPopover();
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
    // Update local cache immediately
    cachedCustomColors[currentChatKey] = hex;
    applyColorImmediately(window.location.href);
    closePopover();

    // Persist to storage in background
    await ClaudeStorage.setCustomColor(currentChatKey, hex);
  }

  /**
   * Resets color to auto-assigned seed.
   */
  async function resetToAuto() {
    if (currentChatKey) {
      delete cachedCustomColors[currentChatKey];
      applyColorImmediately(window.location.href);
      closePopover();
      await ClaudeStorage.removeCustomColor(currentChatKey);
    }
  }

  /* ==========================================================================
     4. Tab Title Prefix
     ========================================================================== */

  function applyTabTitlePrefix() {
    if (!cachedSettings?.prefixTabTitle || !currentColorInfo) return;
    const bullet = '● ';
    if (!document.title.startsWith(bullet)) {
      document.title = bullet + ClaudeUtils.cleanTitle(document.title) + ' - Claude';
    }
  }

  /* ==========================================================================
     5. Zero-Lag Navigation & Event Listeners
     ========================================================================== */

  function checkRouteChanges() {
    const currentHref = window.location.href;
    if (currentHref !== lastHref) {
      applyColorImmediately(currentHref);
    }
    // Also re-mount badge if Claude redrew header
    if (cachedSettings?.showInPageBadge) {
      const badge = document.getElementById('claude-tint-header-badge');
      if (!badge || !document.contains(badge)) {
        applyHeaderBadge();
      }
    }
  }

  function setupSpaNavigationListener() {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;

    // Instant synchronous interception on pushState
    history.pushState = function (...args) {
      const ret = originalPush.apply(this, args);
      applyColorImmediately(window.location.href);
      return ret;
    };

    // Instant synchronous interception on replaceState
    history.replaceState = function (...args) {
      const ret = originalReplace.apply(this, args);
      applyColorImmediately(window.location.href);
      return ret;
    };

    // Instant browser back/forward navigation
    window.addEventListener('popstate', () => {
      applyColorImmediately(window.location.href);
    });

    // Preemptive click listener: when user clicks a link to another chat in Claude's sidebar,
    // immediately transition the color bar in 0ms before React completes routing!
    document.addEventListener(
      'click',
      (e) => {
        const link = e.target.closest('a[href*="/chat/"], a[href*="/project/"]');
        if (link && link.href) {
          applyColorImmediately(link.href, link.textContent);
        }
      },
      { capture: true, passive: true }
    );
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' || areaName === 'local') {
        if (changes[ClaudeStorage.STORAGE_KEYS.SETTINGS]) {
          cachedSettings = changes[ClaudeStorage.STORAGE_KEYS.SETTINGS].newValue || { ...ClaudeStorage.DEFAULT_SETTINGS };
        }
        if (changes[ClaudeStorage.STORAGE_KEYS.CUSTOM_COLORS]) {
          cachedCustomColors = changes[ClaudeStorage.STORAGE_KEYS.CUSTOM_COLORS].newValue || {};
        }
        applyColorImmediately(window.location.href);
      }
    });
  }

  function setupRuntimeMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'REFRESH_COLOR' || message.type === 'SETTINGS_UPDATED') {
        (async () => {
          if (message.settings) {
            cachedSettings = message.settings;
          } else {
            cachedSettings = await ClaudeStorage.getSettings();
          }
          cachedCustomColors = await ClaudeStorage.getCustomColors();
          applyColorImmediately(window.location.href);
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
