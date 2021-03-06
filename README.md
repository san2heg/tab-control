# [Tab Control](https://chrome.google.com/webstore/detail/tab-control/hheohnanbmmjfpnpgcejpnabbnjhbhip)

A chrome extension to keep control of your tabs.

## Scripts

### clean-css

Purifies and minifies css. No arguments.
```
sh clean-css
```

### pack

Removes unnecessary files and packs extension into .zip to upload.

Usage: `sh pack <VERSION> <PROJECT_DIRECTORY_NAME>`
```
sh pack 1.3.4 tab-control
```

## Version Log

### 1.4.0
- Height of extension is now set as to avoid glitchy CSS
- Can now toggle Tab Control on/off

### 1.3.5
- Fixed glitchy height bug

### 1.3.4
- Fixed some UI bugs

### 1.3.3
- New icon!
- Added scroll bar for recent list
- Minified and purified CSS
- First public deployment of extension

### 1.3.2
- Recently removed tabs now shift correctly
- Recents list clears correctly upon Chrome restart
- Added feedback link

### 1.3.1
- Removing a blank 'New Tab' no longer saves to recently removed

### 1.3.0
- Purge duplicate functionality fixed
- Now saves 10 removed tabs in popup

### 1.2.0
- Now ignores pinned tabs
- Purge duplicates button added
- Purge inactive button added
- Purge windows button removed
- No longer replaces tabs, just removes oldest

### 1.1.0
- Tab limit option now persists after Chrome closes
- When user attempts to decrease tab limit lower than current amount of tabs.
  the least active tab will be removed

### 1.0.0
First unlisted deployment of extension. Features:
- Purge tabs and purge windows buttons
- When Tab limit is exceeded, least active tab gets replaced
