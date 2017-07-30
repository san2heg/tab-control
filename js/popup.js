let MAX_TABS = 15;
let MIN_TABS = 4;
let DEFAULT_TABS = 10;

$(document).ready(init);

function init() {
  initTabLimit();
  $("#purgeCurrent").click(purgeTabs);
  $("#purgeAll").click(purgeAllTabs);
  $("#decrementLimit").click(decrementTabLimit);
  $("#incrementLimit").click(incrementTabLimit);
}

// Increment Tab limit through message to background.js
// Then update popup
function incrementTabLimit() {
  chrome.storage.sync.get(function(options) {
    let temp_limit = options['tab_limit'] += 1;
    if (temp_limit >= MIN_TABS && temp_limit <= MAX_TABS) {
      options['tab_limit'] = temp_limit;
      $("#tab_limit").text(temp_limit.toString());
      chrome.storage.sync.set(options);
    }
  });
  // chrome.runtime.sendMessage({
  //   changeValue: 1
  // }, function(message) {
  //   $("#tab_limit").text(message.limit.toString());
  // });
}

// Decrement Tab limit through message to background.js
// Then update popup
function decrementTabLimit() {
  chrome.storage.sync.get(function(options) {
    let temp_limit = options['tab_limit'] -= 1;
    if (temp_limit >= MIN_TABS && temp_limit <= MAX_TABS) {
      options['tab_limit'] = temp_limit;
      $("#tab_limit").text(temp_limit.toString());
      chrome.storage.sync.set(options);
    }
  });

  // chrome.runtime.sendMessage({
  //   changeValue: -1
  // }, function(message) {
  //   $("#tab_limit").text(message.limit.toString());
  // });
}

// Get Tab limit through message to background.js
function initTabLimit() {
  var limit = DEFAULT_TABS;
  chrome.storage.sync.get(function(options) {
    if (options['tab_limit'] != undefined) {
      limit = options['tab_limit'];
    }
    chrome.storage.sync.set(options);
  });
  $("#tab_limit").text(limit.toString());

  // chrome.runtime.sendMessage({
  //   changeValue: 0
  // }, function(message) {
  //   $("#tab_limit").text(message.limit.toString());
  // });
}

// Removes all tabs in current window and replaces with fresh tab
function purgeTabs() {
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
