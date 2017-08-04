$(document).ready(init);

// Start point
function init() {
  initTabLimit();
  $("#purgeCurrent").click(purgeTabs);
  $("#purgeAll").click(purgeAllTabs);
  $("#decrementLimit").click(decrementTabLimit);
  $("#incrementLimit").click(incrementTabLimit);
  $("#purgeDuplicates").click(purgeDuplicates);
  $("#purgeInactive").click(purgeInactive);
}

// Increment Tab limit through message to background.js
// Then update popup
function incrementTabLimit() {
  chrome.runtime.sendMessage({
    changeValue: 1
  }, function(message) {
    $("#tab_limit").text(message.limit.toString());
  });
}

// Decrement Tab limit through message to background.js
// Then update popup
function decrementTabLimit() {
  chrome.runtime.sendMessage({
    changeValue: -1
  }, function(message) {
    $("#tab_limit").text(message.limit.toString());
  });
}

// Get Tab limit through message to background.js
function initTabLimit() {
  chrome.runtime.sendMessage({
    changeValue: 0
  }, function(message) {
    $("#tab_limit").text(message.limit.toString());
  });
}

function purgeTabs() {
  chrome.runtime.sendMessage({
    purgeTabs: true
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

// Send message to remove duplicate tabs in terms of URL hostname
function purgeDuplicates() {
  chrome.runtime.sendMessage({
    purgeDuplicates: true
  });
}

// Send message to remove inactive tabs according to inactivity option
function purgeInactive() {
  chrome.runtime.sendMessage({
    purgeInactive: true
  });
}
