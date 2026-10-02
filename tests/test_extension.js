/**
 * Claude Tab Colorist - Comprehensive Test Suite
 * Validates Color system, URL utilities, Storage logic, and Manifest V3 integrity.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load modules under test
const ClaudeColors = require('../src/shared/colors.js');
const ClaudeUtils = require('../src/shared/utils.js');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

console.log('\n--- 1. Testing Color System ---');

test('Preset colors contains 16 distinct curated colors', () => {
  assert.strictEqual(ClaudeColors.PRESET_COLORS.length, 16);
  const hexes = new Set();
  for (const c of ClaudeColors.PRESET_COLORS) {
    assert.match(c.hex, /^#[0-9A-Fa-f]{6}$/, `Invalid hex: ${c.hex}`);
    assert.ok(c.name && c.name.length > 0, `Missing name for ${c.hex}`);
    assert.ok(!hexes.has(c.hex.toLowerCase()), `Duplicate hex: ${c.hex}`);
    hexes.add(c.hex.toLowerCase());
  }
});

test('hashStringToColor returns deterministic results', () => {
  const chatIdA = 'e0e98031-bb61-460b-853f-7233ec7c9a63';
  const chatIdB = 'f1f88142-cc72-471c-964a-8344fd8d0b74';
  
  const colorA1 = ClaudeColors.hashStringToColor(chatIdA);
  const colorA2 = ClaudeColors.hashStringToColor(chatIdA);
  const colorB = ClaudeColors.hashStringToColor(chatIdB);

  assert.strictEqual(colorA1.hex, colorA2.hex, 'Same chat ID must always return identical color');
  assert.notStrictEqual(colorA1.hex, colorB.hex, 'Different chat IDs should yield different colors');
});

test('Color conversion helpers', () => {
  const rgb = ClaudeColors.hexToRgb('#CC785C');
  assert.deepStrictEqual(rgb, { r: 204, g: 120, b: 92 });

  const hex = ClaudeColors.rgbToHex(204, 120, 92);
  assert.strictEqual(hex.toLowerCase(), '#cc785c');

  const rgba = ClaudeColors.hexToRgba('#CC785C', 0.5);
  assert.strictEqual(rgba, 'rgba(204, 120, 92, 0.5)');

  const darkContrast = ClaudeColors.getContrastColor('#FAF9F5');
  assert.strictEqual(darkContrast, '#1F1E1D');

  const lightContrast = ClaudeColors.getContrastColor('#1F1E1D');
  assert.strictEqual(lightContrast, '#FFFFFF');
});

console.log('\n--- 2. Testing URL & Chat Utilities ---');

test('isClaudeUrl correctly identifies Claude domains', () => {
  assert.strictEqual(ClaudeUtils.isClaudeUrl('https://claude.ai/chat/123'), true);
  assert.strictEqual(ClaudeUtils.isClaudeUrl('https://preview.claude.ai/chat/123'), true);
  assert.strictEqual(ClaudeUtils.isClaudeUrl('https://google.com'), false);
  assert.strictEqual(ClaudeUtils.isClaudeUrl('https://fakeclaude.ai'), false);
  assert.strictEqual(ClaudeUtils.isClaudeUrl('not-a-url'), false);
});

test('extractChatId handles chat and project URLs', () => {
  assert.strictEqual(
    ClaudeUtils.extractChatId('https://claude.ai/chat/e0e98031-bb61-460b-853f-7233ec7c9a63'),
    'e0e98031-bb61-460b-853f-7233ec7c9a63'
  );
  assert.strictEqual(
    ClaudeUtils.extractChatId('https://claude.ai/project/my-awesome-project'),
    'project-my-awesome-project'
  );
  assert.strictEqual(ClaudeUtils.extractChatId('https://claude.ai/new'), null);
  assert.strictEqual(ClaudeUtils.extractChatId('https://claude.ai/chats'), null);
});

test('getChatKey produces correct keys', () => {
  assert.strictEqual(
    ClaudeUtils.getChatKey('https://claude.ai/chat/abc-123', 42),
    'chat:abc-123'
  );
  assert.strictEqual(
    ClaudeUtils.getChatKey('https://claude.ai/new', 42),
    'tab:42'
  );
});

test('cleanTitle removes Claude branding and bullet prefixes', () => {
  assert.strictEqual(ClaudeUtils.cleanTitle('● State Machine Design - Claude'), 'State Machine Design');
  assert.strictEqual(ClaudeUtils.cleanTitle('Chat with Claude | Claude'), 'Chat with Claude');
  assert.strictEqual(ClaudeUtils.cleanTitle('Claude'), 'Claude Chat');
});

console.log('\n--- 3. Testing Storage & Color Resolver Logic ---');

async function runStorageTests() {
  // Set up a mock chrome.storage
  const memoryStore = {};
  global.chrome = {
    storage: {
      sync: {
        get: async (keys) => {
          if (typeof keys === 'string') return { [keys]: memoryStore[keys] };
          return memoryStore;
        },
        set: async (items) => {
          Object.assign(memoryStore, items);
        }
      }
    }
  };

  const ClaudeStorage = require('../src/shared/storage.js');

  await testAsync('Storage initializes with default settings', async () => {
    const settings = await ClaudeStorage.getSettings();
    assert.strictEqual(settings.tintFavicon, true);
    assert.strictEqual(settings.showTopAccent, true);
    assert.strictEqual(settings.accentHeight, 4);
    assert.strictEqual(settings.accentStyle, 'glow');
    assert.strictEqual(settings.glowIntensity, 'medium');
  });

  await testAsync('resolveColorSync produces immediate synchronous results without IPC', async () => {
    const chatKey = 'chat:sync-test-456';
    const customColors = { [chatKey]: '#8E5572' };
    
    // Custom match
    const customRes = ClaudeStorage.resolveColorSync(chatKey, customColors, true);
    assert.strictEqual(customRes.isCustom, true);
    assert.strictEqual(customRes.hex, '#8E5572');

    // Auto match
    const autoRes = ClaudeStorage.resolveColorSync('chat:other-789', customColors, true);
    assert.strictEqual(autoRes.isCustom, false);
    assert.ok(autoRes.hex.startsWith('#'));
  });

  await testAsync('Custom colors override deterministic auto colors', async () => {
    const chatKey = 'chat:test-123';
    
    // Initial auto resolution
    const autoColor = await ClaudeStorage.resolveColor(chatKey);
    assert.strictEqual(autoColor.isCustom, false);
    
    // Set custom override
    await ClaudeStorage.setCustomColor(chatKey, '#2D6A4F');
    const customColor = await ClaudeStorage.resolveColor(chatKey);
    assert.strictEqual(customColor.isCustom, true);
    assert.strictEqual(customColor.hex, '#2D6A4F');

    // Remove custom override
    await ClaudeStorage.removeCustomColor(chatKey);
    const revertedColor = await ClaudeStorage.resolveColor(chatKey);
    assert.strictEqual(revertedColor.isCustom, false);
    assert.strictEqual(revertedColor.hex, autoColor.hex);
  });

  test('Popover viewport boundary positioning logic', () => {
    // Simulate badge at the top-right corner of a 1440px wide viewport
    const windowWidth = 1440;
    const windowHeight = 900;
    const badgeRect = { left: 1380, right: 1420, top: 16, bottom: 44, width: 40, height: 28 };
    const popoverWidth = 260;
    const popoverHeight = 310;
    const padding = 12;

    let left = badgeRect.left;
    if (left + popoverWidth > windowWidth - padding) {
      left = badgeRect.right - popoverWidth;
    }
    left = Math.max(padding, Math.min(windowWidth - popoverWidth - padding, left));

    let top = badgeRect.bottom + 8;
    if (top + popoverHeight > windowHeight - padding) {
      top = badgeRect.top - popoverHeight - 8;
    }

    // Verify popover is 100% inside the viewport bounds
    assert.ok(left >= padding, `Left edge ${left} must be >= ${padding}`);
    assert.ok(left + popoverWidth <= windowWidth - padding, `Right edge ${left + popoverWidth} must be <= ${windowWidth - padding}`);
    assert.ok(top >= padding, `Top edge ${top} must be >= ${padding}`);
    assert.ok(top + popoverHeight <= windowHeight - padding, `Bottom edge ${top + popoverHeight} must be <= ${windowHeight - padding}`);
    // Specifically verify it flipped inwards:
    assert.strictEqual(left, 1420 - 260, 'Should align to badge right edge when badge is in top-right corner');
  });
}

console.log('\n--- 4. Testing Manifest V3 & File Integrity ---');

test('manifest.json structure and references', () => {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
  assert.ok(manifest.name, 'Manifest must have a name');
  assert.ok(manifest.version, 'Manifest must have a version');
  assert.ok(manifest.description, 'Manifest must have a description');

  // Verify all icon paths exist
  for (const [size, iconPath] of Object.entries(manifest.icons)) {
    const fullPath = path.join(__dirname, '..', iconPath);
    assert.ok(fs.existsSync(fullPath), `Icon file ${iconPath} (${size}px) must exist`);
  }

  // Verify action icons exist
  for (const [size, iconPath] of Object.entries(manifest.action.default_icon)) {
    const fullPath = path.join(__dirname, '..', iconPath);
    assert.ok(fs.existsSync(fullPath), `Action icon ${iconPath} (${size}px) must exist`);
  }

  // Verify popup files
  const popupHtml = path.join(__dirname, '..', manifest.action.default_popup);
  assert.ok(fs.existsSync(popupHtml), `Popup HTML ${popupHtml} must exist`);

  // Verify background worker
  const workerPath = path.join(__dirname, '..', manifest.background.service_worker);
  assert.ok(fs.existsSync(workerPath), `Background worker ${workerPath} must exist`);

  // Verify content scripts
  for (const cs of manifest.content_scripts) {
    for (const js of cs.js) {
      const fullPath = path.join(__dirname, '..', js);
      assert.ok(fs.existsSync(fullPath), `Content script ${js} must exist`);
    }
    for (const css of cs.css) {
      const fullPath = path.join(__dirname, '..', css);
      assert.ok(fs.existsSync(fullPath), `Content CSS ${css} must exist`);
    }
  }

  // Verify permissions
  assert.ok(manifest.permissions.includes('storage'), 'Must request storage permission');
  assert.ok(manifest.permissions.includes('tabs'), 'Must request tabs permission');
  assert.ok(manifest.host_permissions.includes('https://claude.ai/*'), 'Must include claude.ai host permission');
});

runStorageTests().then(() => {
  console.log(`\nResults: ${passedTests} passed, ${failedTests} failed.`);
  if (failedTests > 0) {
    process.exit(1);
  }
});
