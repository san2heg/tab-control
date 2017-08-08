$(document).ready(init);

// Start point
function init() {
  initTabLimit();
  initRecentList();
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

// Get and display the list of recently removed tabs
function initRecentList() {
  chrome.storage.local.get(function(obj) {
    var recent_list = obj.recent_list
    console.log(recent_list);
    if (recent_list == undefined || recent_list.length <= 0) {
      var html_str = "<div class=\"row\" style=\"height: 30px;\"><h4>No Recents</h4></div>";
      $('#recent-list-title').after(html_str);
    }
    else {
      for (var i=0; i<recent_list.length; i++) {
        var tab_wrapper = recent_list[i];
        $('#recent-list-title').after(getListEntryRow(tab_wrapper.tab.url, tab_wrapper.tab.title, tab_wrapper.tab.favIconUrl, tab_wrapper.time_last_active));
      }
    }
  });
}

// Helper - Returns string of HTML URL text within a row for recents list
function getListEntryRow(url, title, faviconUrl, time_last_active) {
  var html_str = "";
  html_str += "<div class=\"row recent-entry\">";
  html_str += " <div class=\"column column-10 fav-img\">"
  html_str += "   <img class=\"entry-img\" src=\"" + faviconUrl + "\" width=\"16\" height=\"16\">"
  html_str += " </div>"
  html_str += " <div class=\"column column-80\" style=\"padding-left: 4px; padding-right: 4px;\">"
  html_str += "   <a target=\"_blank\" style=\"display: block; width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;\" href=\"" + url + "\">" + title + "</a>"
  html_str += " </div>"
  html_str += " <div class=\"column\">"
  html_str += "   <p style=\"font-weight: 400; color: #808080; font-size: 13px; margin-top: 4px;\">" + getFormattedTimeFromTimestamp(time_last_active) + "</p>"
  html_str += " </div>"
  html_str += "</div>";
  return html_str;
}

// Helper - Return Date from UNIX timestamp
function getFormattedTimeFromTimestamp(timestamp) {
  var date = new Date(timestamp);
  return timeSince(date);
}

// Helper - Return string for time since, e.g. 4 minutes ago
function timeSince(date) {
  var seconds = Math.floor((new Date() - date) / 1000);
  var interval = Math.floor(seconds / 31536000);
  if (interval > 1) {
    return interval + "y";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + "mo";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + "d";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + "h";
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + "m";
  }
  return Math.floor(seconds) + "s";
}

// Removes all tabs from current window and replaces with fresh tab
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

/* TEMPLATE FOR RECENT LIST ENTRY
<div class="row recent-entry">
  <div class="column column-10 fav-img">
    <img class="entry-img" src="img/favicon.ico" width="16" height="16">
  </div>
  <div class="column column-75">
    <a href="http://google.com">http://google.comefio</a>
  </div>
  <div class="column">
    <p>5:17</p>
  </div>
</div>
*/
