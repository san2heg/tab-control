// Import dependencies - must be at top level in service worker
importScripts('constants.js', 'TabWrapper.js');

// tabs_all[<windowId>.toString()][<tabId>.toString()]
// -> <TabWrapper instance>
var tabs_all = {};

// OPTIONS
var TAB_LIMIT = DEFAULT_TAB_LIMIT;
var TC_ACTIVE = true;
var INACTIVE_TIME = 15; // in minutes
var RECENTS_LIMIT = 10;

// Initialize state every time the service worker starts.
// In MV3, the service worker can be terminated and restarted at any time,
// so we rebuild tabs_all from chrome.tabs.query and restore activity
// timestamps from chrome.storage.session.
var stateReady = initializeState();

async function initializeState() {
  // Restore options from sync storage
  var syncData = await chrome.storage.sync.get(['tab_limit', 'tc_active']);
  TAB_LIMIT = syncData.tab_limit != undefined ? syncData.tab_limit : DEFAULT_TAB_LIMIT;
  TC_ACTIVE = syncData.tc_active != undefined ? syncData.tc_active : true;

  // Restore tab activity timestamps from session storage (survives service
  // worker restarts but clears when the browser closes)
  var sessionData = await chrome.storage.session.get('tab_timestamps');
  var timestamps = sessionData.tab_timestamps || {};

  // Rebuild tabs_all from all current Chrome tabs
  var allTabs = await chrome.tabs.query({});
  tabs_all = {};
  for (var i = 0; i < allTabs.length; i++) {
    var tab = allTabs[i];
    var wId = tab.windowId.toString();
    var tId = tab.id.toString();
    if (tabs_all[wId] == undefined) tabs_all[wId] = {};
    var wrapper = new TabWrapper(tab);
    if (timestamps[tId]) {
      wrapper.time_created = timestamps[tId].time_created;
      wrapper.time_last_active = timestamps[tId].time_last_active;
    }
    tabs_all[wId][tId] = wrapper;
  }
}

// Persist tab activity timestamps to session storage so they survive
// service worker restarts
function persistTimestamps() {
  var timestamps = {};
  for (var windowId in tabs_all) {
    for (var tabId in tabs_all[windowId]) {
      timestamps[tabId] = {
        time_created: tabs_all[windowId][tabId].time_created,
        time_last_active: tabs_all[windowId][tabId].time_last_active
      };
    }
  }
  chrome.storage.session.set({ tab_timestamps: timestamps });
}

// Startup: clear recent list (same as MV2 behavior)
chrome.runtime.onStartup.addListener(function() {
  console.log('Starting up...');
  chrome.storage.local.remove('recent_list');
});

// Called when extension is reloaded/installed
chrome.runtime.onInstalled.addListener(function() {
  console.log("Reloaded/Reinstalled");
});

// Receive messages from popup for certain actions:
// 1) Change TAB_LIMIT by message.changeValue
//    Min: MIN_TAB_LIMIT, Max: MAX_TAB_LIMIT
// 2) Purge inactive tabs if message.purgeActive is true
// 3) Purge duplicate tabs if message.purgeDuplicates is true
// 4) Purge window tabs if message.purgeTabs is true
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.changeValue != undefined) {
    stateReady.then(function() {
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
    return true; // keep message channel open for async sendResponse
  }
  else if (message.toggleValue != undefined) {
    stateReady.then(function() {
      console.log("TC ACTIVE: " + message.toggleValue);
      TC_ACTIVE = message.toggleValue;
      chrome.storage.sync.set({
        'tc_active': message.toggleValue
      });
      if (TC_ACTIVE) {
        cleanTabs();
      }
    });
  }
  else if (message.purgeInactive) {
    stateReady.then(function() { purgeInactive(); });
  }
  else if (message.purgeDuplicates) {
    stateReady.then(function() { purgeDuplicates(); });
  }
  else if (message.purgeTabs) {
    purgeTabs();
  }
});

// Removes all tabs in current window and replaces with fresh tab
function purgeTabs() {
  chrome.tabs.create({
    pinned: false
  });
  chrome.tabs.query({
    currentWindow: true,
    pinned: false // PINNED OPTION
  }, function(tabs) {
    console.log(tabs);
    for (var i=0; i<tabs.length-1; i++) {
      chrome.tabs.remove(tabs[i].id);
    }
  });
}

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
          if (first_tab.time_last_active <= second_tab.time_last_active) {
            chrome.tabs.remove(first_tab.tab.id);
            tabs.splice(i, 1);
            i=0;
            j=0;
          }
          else {
            chrome.tabs.remove(second_tab.tab.id);
            tabs.splice(j, 1);
            i=0;
            j=0;
          }
        }
      }
    }
  });
}

// Helper - Get hostname from URL
// Uses URL API instead of DOM (document is not available in service workers)
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

// Helper - Convert minutes to milliseconds
function getMillisecondsFromMinutes(min) {
  return min * 60 * 1000;
}

// Delete oldest/least active tab, someTab is used to get current window
function removeLeastActiveTab() {
  chrome.windows.getCurrent(function(win) {
    var oldest_tab_id = getLeastActiveTabIdFromWindow(win.id);
    removeAndSaveTab(oldest_tab_id, win.id);
  });
}

// Keep deleting least active tab until # of tabs is equal to tab limit
function cleanTabs() {
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs) {
    var num_tabs = tabs.length;
    while (num_tabs > TAB_LIMIT) {
      var oldest_tab_id = getLeastActiveTabIdFromWindow(tabs[0].windowId);
      removeAndSaveTab(oldest_tab_id, tabs[0].windowId);
      num_tabs--;
    }
  });
}

// Get oldest/least active tab from list of tabs
function getLeastActiveTabIdFromWindow(windowId) {
  var window_tabs = tabs_all[windowId];
  var filtered_window_tabs = Object.keys(window_tabs).reduce(function(filtered_window_tabs, key){
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
  stateReady.then(function() {
    console.log("CREATED: " + tab.id);
    var new_tab = new TabWrapper(tab);
    if (tabs_all[tab.windowId] == undefined)
      tabs_all[tab.windowId] = {};
    tabs_all[tab.windowId][tab.id] = new_tab;
    persistTimestamps();
    // Attempt to replace oldest/least active tab
    if (TC_ACTIVE) {
      var num_unpinned = Object.keys(getUnpinnedTabsFromList(tabs_all[tab.windowId])).length;
      if (num_unpinned > TAB_LIMIT) {
        var oldest_tab_id = getLeastActiveTabIdFromWindow(tab.windowId);
        removeAndSaveTab(oldest_tab_id, tab.windowId);
      }
    }
  });
});

// Remove tabs from:
// (1) chrome
// (2) tabs_all global
// and save tab to recent_list
function removeAndSaveTab(tab_id, window_id) {
  chrome.tabs.remove(tab_id);
  var tab_wrap = tabs_all[window_id.toString()][tab_id.toString()];
  var tab_url = tab_wrap.tab.url;
  delete tabs_all[window_id.toString()][tab_id.toString()];
  persistTimestamps();
  // Add to recently removed list (read from storage since service worker
  // may have restarted and lost in-memory tabs_saved)
  if (tab_url != "chrome://newtab/") {
    chrome.storage.local.get('recent_list', function(data) {
      var tabs_saved = data.recent_list || [];
      var tuple = [];
      tuple.push(tab_wrap);
      tuple.push(Date.now());
      tabs_saved.push(tuple);
      while (tabs_saved.length > RECENTS_LIMIT) {
        tabs_saved.shift();
      }
      chrome.storage.local.set({
        'recent_list': tabs_saved
      });
    });
  }
}

// Listener - Tab Activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  stateReady.then(function() {
    var wId = activeInfo.windowId.toString();
    var tId = activeInfo.tabId.toString();
    if (tabs_all[wId] && tabs_all[wId][tId]) {
      console.log("ACTIVE: " + activeInfo.tabId + ", index: " + tabs_all[wId][tId].tab.index);
      tabs_all[wId][tId].madeActive();
      persistTimestamps();
    }
  });
});

// Listener - Tab Updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  stateReady.then(function() {
    var wId = tab.windowId.toString();
    var tId = tabId.toString();
    if (tabs_all[wId] && tabs_all[wId][tId]) {
      tabs_all[wId][tId].tab = tab;
    }
  });
});

// Listener - Tab Removal
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  stateReady.then(function() {
    console.log("REMOVED: " + tabId);
    var wId = removeInfo.windowId.toString();
    if (tabs_all[wId]) {
      delete tabs_all[wId][tabId.toString()];
      persistTimestamps();
    }
  });
});

// Listener - Window Removal
chrome.windows.onRemoved.addListener(function(windowId) {
  stateReady.then(function() {
    console.log("WINDOW REMOVED: " + windowId);
    delete tabs_all[windowId.toString()];
    persistTimestamps();
  });
});

// Helper - Get filtered list of tabs that are unpinned
function getUnpinnedTabsFromList(window_tabs) {
  var filtered_tabs = Object.keys(window_tabs).reduce(function(filtered_tabs, key) {
    if (!window_tabs[key].tab.pinned) { // PINNED OPTION
      filtered_tabs[key] = window_tabs[key];
    }
    return filtered_tabs;
  }, {});
  return filtered_tabs;
}

// Debugging - Dump all tabs in tabs_all
function dumpTabs() {
  console.log("-start-");
  console.log("#: (window_id) [index]")
  var count = 1;
  for (var window_id in tabs_all) {
    for (var tab_id in tabs_all[window_id.toString()]) {
      var tab_obj = tabs_all[window_id.toString()][tab_id.toString()];
      console.log("#" + count + ": " + "(" + window_id + ")[" + tab_obj.tab.index + "] " + tab_id + ":\t created - " + tab_obj.time_created + ", active - " + tab_obj.time_last_active);
      count+=1;
    }
  }
  console.log("-end-");
}

// Debugging - Dump Chrome tabs (not TabWrappers)
function dumpRawTabs() {
  console.log("-start-");
  chrome.tabs.query({}, function(tabs) {
    console.log(tabs);
    console.log("-end-");
  });
}
