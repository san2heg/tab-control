document.addEventListener('DOMContentLoaded', init);

function init() {
  var purge_button = document.getElementById('purgeCurrent');
  var purge_all_button = document.getElementById('purgeAll');
  purge_button.addEventListener('click', purgeTabs);
  purge_all_button.addEventListener('click', purgeAllTabs);
}

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
