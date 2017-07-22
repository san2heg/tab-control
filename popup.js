var TAB_LIMIT = 10;

document.addEventListener('DOMContentLoaded', init);

function init() {
  var purge_button = document.getElementById('purgeCurrent');
  var purge_all_button = document.getElementById('purgeAll');
  purge_button.addEventListener('click', purgeTabs);
  purge_all_button.addEventListener('click', purgeAllTabs);
}

chrome.tabs.onCreated.addListener(function(tab) {
  appendToLog('TAB CREATED' + tab.id);
  //chrome.tabs.remove(tab.id);
});

// Removes all tabs in current window and replaces with fresh tab
function purgeTabs() {
  appendToLog('purging tabs in current window');
  chrome.tabs.query({
    currentWindow: true
  }, function(tabs) {
    chrome.tabs.create({});
    for (var i=0; i<tabs.length; i++) {
      chrome.tabs.remove(tabs[i].id);
    }
  });
}

// Removes all tabs from all windows and replaces with fresh tab
function purgeAllTabs() {
  chrome.tabs.query({}, function(tabs) {
    chrome.tabs.create({});
    for (var i=0; i<tabs.length; i++) {
      chrome.tabs.remove(tabs[i].id);
    }
  });
}

// Replace oldest tab when total number of tabs in window exceeds limit
function replaceOldestTab(tab) {
  chrome.tabs.remove(tab.id);
  // chrome.tabs.query({
  //   currentWindow: true
  // }, function(tabs) {
  //   if (tabs.length > TAB_LIMIT) {
  //     //var oldest_tab_id = getOldestTabIdFromCurrentWindow();
  //     //chrome.tabs.update(oldest_tab_id, {
  //     //  url: tab.url
  //     //});
  //     chrome.tabs.remove(tab.id);
  //   }
  // });
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
    return Math.min(...arr_tab_id);
  });
}

function appendToLog(log_line) {
  document.getElementById('log').appendChild(document.createElement('div')).innerText = "> " + log_line;
}
