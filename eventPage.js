var TAB_LIMIT = 10;
var all_tabs = {};
// all_tabs[<windowId>.toString()][<tabId>.toString()]
// -> <TabWrapper instance>

// Replace oldest tab when total number of tabs in window exceeds limit
function attemptToReplaceOldestTab(tab) {
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs) {
    if (tabs.length > TAB_LIMIT) {
      let oldest_tab_id = getLeastActiveTabIdFromWindow(tabs[0].windowId);
      let tab_url = tab.url;
      console.log("LEAST ACTIVE TAB: " + oldest_tab_id);
      chrome.tabs.remove(tab.id);
      chrome.tabs.update(oldest_tab_id, {
        url: tab_url,
        active: true
      });

      // let oldest_tab = all_tabs[tabs[0].windowId][oldest_tab_id.toString()]
      // chrome.tabs.move(tab.id, {
      //   index: oldest_tab.tab.index
      // });
      // chrome.tabs.remove(oldest_tab_id);
    }
  });
}

// Get oldest/least active tab from list of tabs
function getLeastActiveTabIdFromWindow(windowId) {
  let window_tabs = all_tabs[windowId.toString()];

  var min_id;
  var i = 0;
  for (var tab_id in window_tabs) {
    if (i > 0) {
      if (all_tabs[windowId][tab_id].time_last_active < all_tabs[windowId][min_id].time_last_active)
        min_id = tab_id;
    }
    else
      min_id = tab_id;
    i++;
  }

  return Number(min_id);
}

// Listener - Tab Creation
chrome.tabs.onCreated.addListener(function(tab) {
  console.log("CREATED: " + tab.id);
  let new_tab = new TabWrapper(tab);
  if (all_tabs[tab.windowId] == undefined)
    all_tabs[tab.windowId] = {};
  all_tabs[tab.windowId][tab.id] = new_tab;
  attemptToReplaceOldestTab(tab);
});

// Listener - Tab Activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log("ACTIVE: " + activeInfo.tabId);
  all_tabs[activeInfo.windowId.toString()][activeInfo.tabId.toString()].madeActive();
});

// // Listener - Tab Updates
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
//
// });

// Listener - Tab Removal
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  console.log("REMOVED: " + tabId);
  delete all_tabs[removeInfo.windowId.toString()][tabId.toString()];
});

// Dump all tabs in all_tabs
function dumpTabs() {
  console.log("-start-");
  for (var window_id in all_tabs) {
    for (var tab_id in all_tabs[window_id.toString()]) {
      var tab_obj = all_tabs[window_id.toString()][tab_id.toString()];
      console.log("(" + window_id + ")[" + tab_obj.tab.index + "] " + tab_id + ":\t created - " + tab_obj.time_created + ", active - " + tab_obj.time_last_active);
    }
  }
  console.log("-end-");
}
