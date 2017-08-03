// tabs_all[<windowId>.toString()][<tabId>.toString()]
// -> <TabWrapper instance>
var tabs_all = {};

// OPTIONS
var TAB_LIMIT;
var INACTIVE_TIME = 15; // in minutes

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

// Receive messages from popup for certain actions:
// 1) Change TAB_LIMIT by message.changeValue
//    Min: MIN_TAB_LIMIT, Max: MAX_TAB_LIMIT
// 2) Purge inactive tabs if message.purgeActive is true
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.changeValue != undefined) {
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
  }
  else if (message.purgeInactive) {
    purgeInactive();
  }
  else if (message.purgeDuplicates) {
    purgeDuplicates();
  }
});

// Removes inactive tabs according to inactivity option
function purgeInactive() {
  chrome.tabs.query({
    currentWindow: true,
    pinned: false // PINNED OPTION
  }, function(tabs) {
    var current_window = tabs[0].windowId;
    for (var i=0; i<tabs.length; i++) {
      if (Date.now() - tabs_all[current_window.toString()][tabs[i].id.toString()].time_last_active >= getMillisecondsFromMinutes(INACTIVE_TIME)) {
        chrome.tabs.remove(tabs[i].id);
      }
    }
  });
}

// Removes duplicate tabs and keeps the most active
function purgeDuplicates() {
  chrome.tabs.query({
    currentWindow: true,
    pinned: false // PINNED OPTION
  }, function(tabs) {
    for (var i=0; i<tabs.length; i++) {
      for (var j=0; j<tabs.length; j++) {
        if (i != j && getHostname(tabs[i].url) == getHostname(tabs[j].url)) {
          var first_tab = tabs_all[tabs[i].windowId.toString()][tabs[i].id.toString()];
          var second_tab = tabs_all[tabs[j].windowId.toString()][tabs[j].id.toString()];
          if (first_tab.time_last_active >= second_tab.time_last_active) {
            chrome.tabs.remove(first_tab.tab.id);
            tabs.splice(i, 1);
            i--;
          }
          else {
            chrome.tabs.remove(second_tab.tab.id);
            tabs.splice(j, 1);
            j--;
          }
        }
      }
    }
  });
}

// Helper - Get hostname from URL
function getHostname(url) {
  let parser = document.createElement('a');
  parser.href = url;
  return parser.hostname;
}

// Helper - Convert minutes to milliseconds
function getMillisecondsFromMinutes(min) {
  return min * 60 * 1000;
}

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
      chrome.tabs.remove(oldest_tab_id);
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
  filtered_window_tabs = Object.keys(window_tabs).reduce(function(filtered_window_tabs, key){
    if (!window_tabs[key].tab.pinned) { // PINNED OPTION
      filtered_window_tabs[key] = window_tabs[key];
    }
    return filtered_window_tabs;
  }, {});
  var min_id;
  var i = 0;
  for (var tab_id in filtered_window_tabs) {
    if (i > 0) {
      if (tabs_all[windowId][tab_id].time_last_active < tabs_all[windowId][min_id].time_last_active)
        min_id = tab_id;
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
  console.log("ACTIVE: " + activeInfo.tabId + ", index: " + tabs_all[activeInfo.windowId.toString()][activeInfo.tabId.toString()].tab.index);
  tabs_all[activeInfo.windowId.toString()][activeInfo.tabId.toString()].madeActive();
});

// Listener - Tab Updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
  tabs_all[tab.windowId.toString()][tabId.toString()].tab = tab;
});

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
