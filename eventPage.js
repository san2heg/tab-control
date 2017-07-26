var TAB_LIMIT = 10;
var all_tabs = {}; // all_tabs[<tabId>.toString()] = <TabWrapper instance>

// Replace oldest tab when total number of tabs in window exceeds limit
function replaceOldestTab(tab) {
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs) {
    if (tabs.length > TAB_LIMIT) {
      var oldest_tab_id = getOldestTabIdFromCurrentWindow();
      console.log("LEAST ACTIVE TAB: " + oldest_tab_id);
      chrome.tabs.update(oldest_tab_id, {
       url: tab.url,
       active: true
      });
      chrome.tabs.remove(tab.id);
    }
  });
}

// Get oldest, least active tab from list of tabs
function getOldestTabIdFromCurrentWindow() {
  var oldest_tab_id;
  Object.keys(all_tabs).reduce(function(a, b) {
    console.log("a = " + a);
    console.log("b = " + b);
    console.log("comparing " + a + " (" + all_tabs[a.toString()].time_last_active + ") to " + b + " (" + all_tabs[b.toString()].time_last_active + ")");
    oldest_tab_id = all_tabs[a.toString()].time_last_active < all_tabs[b.toString()].time_last_active ? a : b;
  });
  return oldest_tab_id;
}

// Listener - Tab Creation
chrome.tabs.onCreated.addListener(function(tab) {
  console.log("CREATED: " + tab.id);
  let new_tab = new TabWrapper(tab);
  all_tabs[tab.id.toString()] = new_tab;
  replaceOldestTab(tab);
});

// Listener - Tab Activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log("ACTIVE: " + activeInfo.tabId);
  all_tabs[activeInfo.tabId.toString()].madeActive();
});

// Listener - Tab Updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){

});

// Listener - Tab Removal
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  console.log("REMOVED: " + tabId);
  delete all_tabs[tabId.toString()];
});

// Dump all tabs in all_tabs
function dumpTabs() {
  console.log("-start-");
  for (var tab_id in all_tabs) {
    var tab_obj = all_tabs[tab_id.toString()]
    console.log("" + tab_id + ":\t created - " + tab_obj.time_created + ", active - " + tab_obj.time_last_active);
  }
  console.log("-end-");
}
