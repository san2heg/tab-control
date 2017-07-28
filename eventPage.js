chrome.storage.local.get(init);

function init(global_tabs) {
  var TAB_LIMIT = 10;
  var tabs_all = global_tabs;

  //var all_tabs = {};
  // all_tabs[<windowId>.toString()][<tabId>.toString()]
  // -> <TabWrapper instance>

  // Replace oldest tab when total number of tabs in window exceeds limit
  function attemptToReplaceOldestTab(tab) {
    chrome.tabs.query({
      currentWindow: true
    }, function(tabs) {
      if (tabs.length > TAB_LIMIT) {
        let oldest_tab_id = getLeastActiveTabIdFromWindow(tabs[0].windowId, tabs_all);
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
  function getLeastActiveTabIdFromWindow(windowId, tabs_all) {
    let window_tabs = tabs_all[windowId.toString()];

    var min_id;
    var i = 0;
    for (var tab_id in window_tabs) {
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

  // Listener - Tab Creation
  chrome.tabs.onCreated.addListener(function(tab) {
    console.log("CREATED: " + tab.id);
    //let new_tab = new TabWrapper(tab);
    // if (all_tabs[tab.windowId] == undefined)
    //   all_tabs[tab.windowId] = {};
    // all_tabs[tab.windowId][tab.id] = new_tab;

    let new_tab = new TabWrapper(tab);
    if (tabs_all == undefined) {
      tabs_all = {};
    }
    if (tabs_all[tab.windowId] == undefined)
      tabs_all[tab.windowId] = {};
    tabs_all[tab.windowId][tab.id] = new_tab;
    chrome.storage.local.set(tabs_all);
    attemptToReplaceOldestTab(tab);
  });

  // Listener - Tab Activation
  chrome.tabs.onActivated.addListener(function(activeInfo) {
    console.log("ACTIVE: " + activeInfo.tabId);
    tabs_all[activeInfo.windowId.toString()][activeInfo.tabId.toString()].madeActive();
    chrome.storage.local.set(tabs_all);
  });

  // // Listener - Tab Updates
  // chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
  //
  // });

  // Listener - Tab Removal
  chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    console.log("REMOVED: " + tabId);
    delete tabs_all[removeInfo.windowId.toString()][tabId.toString()];
    chrome.storage.local.set(tabs_all);
  });

  chrome.windows.onRemoved.addListener(function(windowId) {
    console.log("WINDOW REMOVED: " + windowId);
    delete tabs_all[windowId.toString()];
    console.log("after removed");
    console.log(tabs_all);
    // chrome.storage.local.set(tabs_all);
    chrome.storage.local.remove(windowId.toString());
  });

  // Dump all tabs in tabs_all
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
}
