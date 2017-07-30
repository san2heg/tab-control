var tabs_all = {};
var TAB_LIMIT;
let MAX_TAB_LIMIT = 20;
let MIN_TAB_LIMIT = 4;
let DEFAULT_TAB_LIMIT = 10;
// tabs_all[<windowId>.toString()][<tabId>.toString()]
// -> <TabWrapper instance>

// Startup operations:
// 1. Scan for tabs that may have been missed on startups and wrap them
// 2. Sync all options
chrome.runtime.onStartup.addListener(function() {
  scanForMissedTabs();
  chrome.storage.sync.get(function(lim) {
    if (lim['tab_limit'] != undefined)
      TAB_LIMIT = lim['tab_limit'];
    else
      TAB_LIMIT = DEFAULT_TAB_LIMIT; // default
  });
});

// Receive a message from the popup to change the TAB_LIMIT
// Min: 4, Max: 15
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Message Received: " + message.changeValue);
  var new_limit = TAB_LIMIT + message.changeValue;
  if (new_limit >= MIN_TAB_LIMIT && new_limit <= MAX_TAB_LIMIT) {
    TAB_LIMIT = new_limit;
    chrome.storage.sync.set({
      'tab_limit': new_limit
    });
    chrome.tabs.query({
      currentWindow: true,
      pinned: false // PINNED OPTION
    }, function(tabs) {
      if (tabs.length > TAB_LIMIT) {
        removeLeastActiveTab();
      }
    });
  }
  sendResponse({
    limit: TAB_LIMIT
  });
});

// Scan all tabs and add any tabs to tabs_all that may have been
// missed on Chrome startup
function scanForMissedTabs() {
  chrome.tabs.query({}, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      var missing_windowId = tabs[i].windowId.toString();
      var missing_tabId = tabs[i].id.toString();
      if (tabs_all[missing_windowId] == undefined || tabs_all[missing_windowId][missing_tabId] == undefined) {
        // Add the missing tab
        let new_tab = new TabWrapper(tabs[i]);
        if (tabs_all[missing_windowId] == undefined) {
          tabs_all[missing_windowId] = {};
        }
        tabs_all[missing_windowId][missing_tabId] = new_tab;
      }
    }
  });
}

// Replace oldest tab when total number of tabs in window exceeds limit
function attemptToReplaceOldestTab(tab) {
  chrome.tabs.query({
    currentWindow: true,
    pinned: false // PINNED OPTION
  }, function(tabs) {
    if (tabs.length > TAB_LIMIT) {
      let oldest_tab_id = getLeastActiveTabIdFromWindow(tabs);
      let tab_url = tab.url;
      console.log("LEAST ACTIVE TAB: " + oldest_tab_id);
      chrome.tabs.remove(tab.id);
      chrome.tabs.update(oldest_tab_id, {
        url: tab_url,
        active: true
      });
    }
  });
}

// Delete oldest/least active tab, someTab is used to get current window
function removeLeastActiveTab() {
  chrome.tabs.query({
    currentWindow: true,
    pinned: false // PINNED OPTION
  }, function(tabs) {
    let oldest_tab_id = getLeastActiveTabIdFromWindow(tabs);
    chrome.tabs.remove(oldest_tab_id);
  });
}

// Get oldest/least active tab from list of tabs
function getLeastActiveTabIdFromWindow(unwrapped_window_tabs) {
  let windowId = unwrapped_window_tabs[0].windowId.toString();
  window_tabs = tabs_all[windowId];
  var min_id;
  var i = 0;
  for (var tab_id in window_tabs) {
    if (i > 0) {
      if (tabs_all[windowId][tab_id].time_last_active < tabs_all[windowId][min_id].time_last_active) {
        if (!tabs_all[windowId][tab_id].tab.pinned) // PINNED OPTION
          min_id = tab_id;
      }
    }
    else
      min_id = tab_id;
    i++;
  }
  return Number(min_id);
}

/*
* MARK - Listeners
*/

// Listener - Tab Creation
chrome.tabs.onCreated.addListener(function(tab) {
  console.log("CREATED: " + tab.id);
  let new_tab = new TabWrapper(tab);
  if (tabs_all[tab.windowId] == undefined)
    tabs_all[tab.windowId] = {};
  tabs_all[tab.windowId][tab.id] = new_tab;
  attemptToReplaceOldestTab(tab);
});

// Listener - Tab Activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log("ACTIVE: " + activeInfo.tabId);
  tabs_all[activeInfo.windowId.toString()][activeInfo.tabId.toString()].madeActive();
});

// // Listener - Tab Updates
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
//
// });

// Listener - Tab Removal
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  console.log("REMOVED: " + tabId);
  delete tabs_all[removeInfo.windowId.toString()][tabId.toString()];
});

// Listener - Window Removal
chrome.windows.onRemoved.addListener(function(windowId) {
  console.log("WINDOW REMOVED: " + windowId);
  delete tabs_all[windowId.toString()];
});

// Debugging - Dump all tabs in tabs_all
function dumpTabs() {
  console.log("-start-");
  for (var window_id in tabs_all) {
    for (var tab_id in tabs_all[window_id.toString()]) {
      var tab_obj = tabs_all[window_id.toString()][tab_id.toString()];
      console.log("(" + window_id + ")[" + tab_obj.tab.index + "] " + tab_id + ":\t created - " + tab_obj.time_created + ", active - " + tab_obj.time_last_active);
    }
  }
  console.log("-end-");
}
