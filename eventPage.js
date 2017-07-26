var TAB_LIMIT = 10;
var all_tabs = {}; // all_tabs[<tabId>.toString()] = <TabWrapper instance>

// Replace oldest tab when total number of tabs in window exceeds limit
function replaceOldestTab(tab) {
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs) {
    if (tabs.length > TAB_LIMIT) {
      var oldest_tab_id = getOldestTabIdFromCurrentWindow();
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
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs) {
    var arr_tab_id = [];
    for (var i=0; i<tabs.length; i++) {
      arr_tab_id.push(tabs[i].id);
    }
    var oldest_id = Math.min(...arr_tab_id);
    console.log("OLDEST TAB: " + oldest_id);
    return oldest_id;
  });
}

// Listener - Tab Creation
chrome.tabs.onCreated.addListener(function(tab) {
  console.log("CREATED: " + tab.id);
  let new_tab = new TabWrapper(tab);
  all_tabs[tab.id.toString()] = new_tab;
  //replaceOldestTab(tab);
});

// Listener - Tab Activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log("ACTIVE: " + activeInfo.tabId);
  all_tabs[activeInfo.tabId.toString()].madeActive();
});

// Listener - Tab Removal
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  console.log("REMOVED: " + tabId);
  delete all_tabs[tabId.toString()];
});
