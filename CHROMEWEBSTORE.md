# Chrome Web Store Listing — Claude Tab Colorist

> Last Updated: 2026-10-02

## Store Listing

**Extension Name**
Claude Tab Colorist - Visual Chat Differentiation

**Short Description**
Differentiate Claude chats with harmonious colors, dynamic tab favicons, top accent strips, and custom color assignments.

**Detailed Description**
Differentiate and organize multiple Claude chats at a glance with harmonious, Claude-complementary colors.

When managing dozens of simultaneous conversations on Claude (claude.ai), distinguishing tabs can quickly become difficult. Every tab displays the identical icon and title styling. Claude Tab Colorist solves this by automatically giving each conversation its own distinct color identity, designed to naturally complement Claude's warm paper aesthetic.

KEY FEATURES
- Automatic Color Differentiation: Every Claude chat is automatically assigned an elegant, distinct pigment upon opening.
- Dynamic Tab Favicons: Identifies each tab in Chrome's tab bar by updating the Claude icon with a crisp colored accent badge or emblem.
- Custom Color Overrides: Select any curated preset pigment (Terracotta, Sage, Amber, Aegean Slate, Mulberry, Olive, and more) or choose any custom HEX color.
- Subtle In-Page Accent: A minimal, non-intrusive 3px color strip at the top of the Claude interface reinforces which chat is active without visual distraction.
- Quick In-Page Pill & Popover: Click the minimal color pill directly inside Claude's header to switch colors on the fly.
- Multi-Tab Overview: View and search all open Claude tabs across windows from the extension toolbar popup, and switch between conversations instantly.
- Seamless Dark & Light Mode: All pigments and UI elements adapt gracefully to Claude's light and dark themes.

HOW TO USE IT
1. Open any chat on claude.ai.
2. The tab icon in Chrome and top accent bar will automatically display the conversation's unique color.
3. Click the extension icon in your browser toolbar or the in-page pill in Claude's navigation to pick from 16 curated pigments or pick any custom color.
4. Your color choices are automatically saved and synchronized across your browser sessions.

PRIVACY & PERMISSIONS
Claude Tab Colorist operates entirely inside your local browser. It never collects, tracks, transmits, or shares personal conversation data, chat text, or browsing history. All custom color preferences are saved locally on your device via standard browser storage.

**Category**
Productivity

**Single Purpose**
Visually differentiates multiple Claude AI conversations using dynamic tab favicons and subtle accent colors.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Small Icon | 16×16 PNG | ✅ Ready | `icons/icon-16.png` |
| Medium Icon | 32×32 PNG | ✅ Ready | `icons/icon-32.png` |
| Large Icon | 48×48 PNG | ✅ Ready | `icons/icon-48.png` |
| Screenshot 1 | 1280×800 | ⬜ Template | `assets/screenshot-1.png` |
| Screenshot 2 | 1280×800 | ⬜ Template | `assets/screenshot-2.png` |

### Screenshot Notes
- Screenshot 1: Multiple Claude tabs open in the Chrome tab strip with differentiated color favicons, and the extension popup showing active chat color controls.
- Screenshot 2: In-page Claude header with the minimal color pill badge and the opened quick-picker popover.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Required to store and synchronize user color preferences and display settings across browser sessions. |
| `tabs` | permissions | Required to inspect open Claude tab URLs and titles to list active conversations in the popup and focus tabs upon click. |
| `https://claude.ai/*` | host_permissions | Required to inject the colorist content script to dynamically update tab favicons, render the top accent strip, and show the header color badge on Claude chats. |
| `https://*.claude.ai/*` | host_permissions | Required to ensure consistent functionality across subdomains of Claude AI. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

The extension collects no personal data, no chat contents, and transmits zero data off-device.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
`https://github.com/blair/claude-tab-colorist/blob/main/PRIVACY.md`

## Distribution

**Visibility**: Public
**Regions**: All regions

## Developer Info

**Publisher Name**: Claude Tab Colorist Team
**Contact Email**: support@claudetabcolorist.local

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-10-02 | Initial release with automatic color assignment, dynamic favicons, in-page badge, and popup manager. | Draft |

## Review Notes

### Known Issues / Limitations
- Favicon updates require browser permission on the active Claude tab and standard HTML5 canvas support.
