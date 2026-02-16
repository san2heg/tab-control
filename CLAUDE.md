# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tab Control is a Chrome extension (Manifest V3) that enforces a configurable tab limit per window. When the limit is exceeded, the least recently active tab is automatically removed. It also provides purge actions (all tabs, duplicates, inactive) and shows recently removed tabs in the popup.

## Development

There is no build step, bundler, or test framework. The extension is plain JavaScript with jQuery.

### Loading for development

Load as an unpacked extension in Chrome at `chrome://extensions/` with Developer Mode enabled. Point it at this repo's root directory.

### Scripts

- **CSS cleanup**: `sh clean-css` — runs `purifycss` then `minify` on the Milligram CSS (requires both tools installed globally)
- **Packaging**: `sh pack <VERSION> <PROJECT_DIRECTORY_NAME>` — packages the extension into a .zip for Chrome Web Store upload

### CSS workflow

`css/milligram.css` is the source file. `css/milligram-pure.min.css` is the production file loaded by `popup.html`. During development, swap the CSS link in `popup.html` to use `milligram.css` directly (there's a commented-out line for this).

## Architecture

### Service worker (`js/background.js`)

The core of the extension, runs as a MV3 service worker. Maintains tab state in a global in-memory object:

```
tabs_all[windowId][tabId] → TabWrapper instance
```

Because service workers are ephemeral (Chrome can terminate and restart them at any time), `tabs_all` is rebuilt on each wake-up: current tabs are queried via `chrome.tabs.query` and activity timestamps are restored from `chrome.storage.session`. All event handlers await `stateReady` (a promise from `initializeState()`) before accessing state. After any mutation to `tabs_all`, `persistTimestamps()` writes timestamps to session storage.

Listens to Chrome events (`onCreated`, `onActivated`, `onUpdated`, `onRemoved`, `onStartup`, `onInstalled`) to keep `tabs_all` in sync. When a new tab is created and the unpinned tab count exceeds `TAB_LIMIT`, the least recently active tab is removed and saved to the recents list.

### Popup ↔ Background communication

The popup (`js/popup.js`) communicates with the background script exclusively via `chrome.runtime.sendMessage`. Message types are distinguished by property name: `changeValue`, `toggleValue`, `purgeInactive`, `purgeDuplicates`, `purgeTabs`.

### Storage

- `chrome.storage.sync`: persists `tab_limit` and `tc_active` (toggle state) across devices
- `chrome.storage.local`: persists `recent_list` (cleared on Chrome startup)
- `chrome.storage.session`: persists tab activity timestamps (`tab_timestamps`) across service worker restarts; cleared when the browser closes

### Key behaviors

- Pinned tabs are always excluded from all tab management operations
- Duplicates are identified by hostname (not full URL)
- Inactive tabs are those not active for `INACTIVE_TIME` minutes (default 15)
- Tab limit range: 4–20 (constants in `js/constants.js`)
- Recently removed list is capped at 10 entries (`RECENTS_LIMIT`)
