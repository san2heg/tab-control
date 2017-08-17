$(document).ready(init);

// Start point
function init() {
  initToggle();
  initTabLimit();
  initRecentList();
  $("#purgeCurrent").click(purgeTabs);
  $("#purgeAll").click(purgeAllTabs);
  $("#decrementLimit").click(decrementTabLimit);
  $("#incrementLimit").click(incrementTabLimit);
  $("#purgeDuplicates").click(purgeDuplicates);
  $("#purgeInactive").click(purgeInactive);
  $("#toggle").click(toggleTC);
}

// Toggle Tab Control on and off
// On: Everything functioning
// Off: Still records tabs in background but does nothing on tab creation
function toggleTC() {
  var toggleValue; // true -> checked
  if ($(this).is(":checked")) {
    toggleValue = true;
    enableTC();
  }
  else {
    toggleValue = false;
    disableTC();
  }
  chrome.runtime.sendMessage({
    toggleValue: toggleValue
  }, function(message) {
    console.log("Response received");
  });
}

// Helper - Fade in disable div
function disableTC() {
  $(".disable-overlay").fadeIn("slow");
}

// Helper - Make display:none for disable div
function enableTC() {
  $(".disable-overlay").fadeOut("slow");
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

// Initialize state of toggle
function initToggle() {
  chrome.storage.sync.get(function(obj) {
    if (obj.tc_active || obj.tc_active == undefined) {
      $("#toggle").prop('checked', true);
      enableTC();
    }
    else {
      $("#toggle").prop('checked', false);
      disableTC();
    }
  });
}

// Get Tab limit through message to background.js
function initTabLimit() {
  chrome.storage.sync.get(function(obj) {
    $("#tab_limit").text(obj.tab_limit.toString());
  });
}

// Get and display the list of recently removed tabs
function initRecentList() {
  chrome.storage.local.get(function(obj) {
    var recent_list = obj.recent_list
    console.log(recent_list);
    if (recent_list == undefined || recent_list.length <= 0) {
      var html_str = "<div id=\"no-recents\" class=\"row\"><h4><br/>No Recents</h4></div>";
      $('#recent-list').after(html_str);
      $('.fade').hide();
      $('#recent-list').hide();
    }
    else {
      if (recent_list.length <= 3) {
        $('.fade').hide();
      }
      for (var i=0; i<recent_list.length; i++) {
        var tab_wrapper = recent_list[i];
        $('#recent-list').prepend(getListEntryRow(tab_wrapper[0].tab.url, tab_wrapper[0].tab.title, tab_wrapper[0].tab.favIconUrl, tab_wrapper[1]));
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
  html_str += " <div id=\"recent-link-col\" class=\"column column-75\">"
  html_str += "   <a target=\"_blank\" id=\"recent-link\" href=\"" + url + "\">" + title + "</a>"
  html_str += " </div>"
  html_str += " <div id=\"recent-time-col\" class=\"column\">"
  html_str += "   <p id=\"recent-time\">" + getFormattedTimeFromTimestamp(time_last_active) + "</p>"
  html_str += " <div class=\"column\">"
  html_str += " </div>"
  html_str += "</div>";
  return html_str;
}

// Helper - Return Date from UNIX timestamp
function getFormattedTimeFromTimestamp(timestamp) {
  if (timestamp == undefined) {
    return "";
  }
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
