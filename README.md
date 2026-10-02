# Claude Tab Colorist

> **A minimal, elegant Chrome Extension for visual chat differentiation on Claude (`claude.ai`).**  
> Differentiate multiple active conversations using Claude-complementary pigments, dynamic tab strip favicons, subtle in-page accent strips, and custom color assignments.

---

## 🎨 Overview

When juggling multiple Claude chats simultaneously, identifying tabs in Chrome's tab bar can be difficult. Every tab has the exact same black/terracotta sunburst icon and truncated title.

**Claude Tab Colorist** provides a visual differentiation system designed specifically to honor and complement Claude's warm, literary aesthetic rather than fight it:

- **Automatic Deterministic Colors**: Every Claude chat (`/chat/:id`, `/project/:id`) automatically receives an elegant, consistent pigment upon opening, hashed deterministically from the chat identifier.
- **Dynamic Tab Favicons**: The tab icon in the Chrome tab strip is dynamically updated with a crisp colored accent badge or full monochrome emblem, making tabs identifiable at a glance.
- **Custom Color Assignments**: Assign set colors to any conversation via the toolbar popup or the embedded in-page pill. Choose from 16 Claude-curated pigments (Terracotta, Sunlit Amber, Earthy Sage, Aegean Slate, Warm Mulberry, Vintage Rose, etc.) or enter any custom HEX value.
- **Minimal Top Accent Strip**: A sleek, non-distracting 3px accent bar at the top of the viewport confirms which chat you are in without adding UI clutter.
- **In-Page Header Badge & Mini Quick Picker**: A discreet color pill seamlessly integrates into Claude's top navigation bar. Click it to open a mini palette popover directly on the page.
- **Multi-Tab Overview**: Open the extension popup to view all active Claude tabs across windows, their assigned colors, and switch to any conversation with one click.
- **Adaptive Dark & Light Mode**: Harmonizes with both light (warm cream) and dark (charcoal/warm stone) Claude themes.

---

## 🚀 Installation (Load Unpacked)

1. Open Google Chrome (or any Chromium browser like Brave, Edge, Arc).
2. Navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select this folder:
   ```
   /Users/blair/Desktop/Projects/Chrome extension
   ```
6. The **Claude Tab Colorist** extension is now active! Pin it to your Chrome toolbar for easy access.

---

## 🧭 How It Works

### 1. Tab Strip Differentiation
Chrome displays the favicon for each open tab. Claude Tab Colorist renders a dedicated 32×32 canvas element combining Claude's iconic starburst with a high-contrast colored badge dot in the bottom-right corner. When you have 8 Claude tabs open, each tab has its own distinct color marker in the Chrome tab bar.

### 2. In-Page Top Accent
A fixed `3px` strip at the top of `claude.ai` matches the chat's color with zero interaction interference (`pointer-events: none`). You can adjust the thickness (2px, 3px, 4px, 6px) or disable it entirely in preferences.

### 3. In-Page Header Pill & Mini Popover
When viewing a conversation on Claude, a small pill appears in Claude's navigation header:
- Click the pill to open the mini quick picker directly on the page.
- Select any preset pigment or input a custom hex code.
- Click **Reset to Auto** to restore the deterministic algorithm.

### 4. Extension Toolbar Popup
Clicking the extension icon in your Chrome toolbar displays:
- The currently active Claude conversation, title, ID, and color status (**Custom** vs. **Auto Assigned**).
- The 16 preset pigments and native HTML color picker.
- A live list of all open Claude tabs across windows with one-click tab switching.
- Display preferences (Favicon style, accent height, tab title prefix).

---

## 🧱 Architecture & Directory Structure

```
├── manifest.json              # Manifest V3 configuration
├── CHROMEWEBSTORE.md          # Chrome Web Store listing & permissions justification
├── README.md                  # Complete documentation
├── icons/                     # Real PNG icons generated with anti-aliasing
│   ├── icon-16.png            # 16×16 toolbar icon
│   ├── icon-32.png            # 32×32 retina icon
│   ├── icon-48.png            # 48×48 extensions page icon
│   └── icon-128.png           # 128×128 store & installation icon
├── scripts/
│   └── generate_icons.py      # Standalone Python script to regenerate icons
├── src/
│   ├── background/
│   │   └── service-worker.js  # Ephemeral background worker (tabs, badge, storage sync)
│   ├── content/
│   │   ├── content.js         # Canvas favicon generator, SPA route observer, in-page UI
│   │   └── content.css        # Minimalist styles matching Claude aesthetic
│   ├── popup/
│   │   ├── popup.html         # Toolbar popup interface
│   │   ├── popup.css          # Claude-inspired styling (warm cream & dark mode)
│   │   └── popup.js           # Active tab controller & color manager
│   └── shared/
│       ├── colors.js          # 16 curated Claude pigments & FNV-1a deterministic hash
│       ├── storage.js         # Chrome storage sync with local fallback
│       └── utils.js           # URL parsing and title cleaning
└── tests/
    └── test_extension.js      # Automated unit test suite
```

---

## 🧪 Testing

Run the automated test suite locally:

```bash
node tests/test_extension.js
```

All 10 tests verify color consistency, deterministic hashing, URL parsing, storage fallback, and Manifest V3 integrity.

---

## 🔒 Privacy & Permissions

- **`storage`**: Used exclusively to store your preferred color overrides and display preferences.
- **`tabs`**: Used exclusively to read the title and URL of `claude.ai` tabs to list them in the popup and switch between them.
- **`host_permissions` (`https://claude.ai/*`)**: Restricts content script execution strictly to Claude. Zero data is ever sent to any remote server.
