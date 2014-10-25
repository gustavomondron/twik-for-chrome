/*
 * Copyright (C) 2014 Red Dye No. 2
 *
 * This file is part of Twik.
 *
 * Twik is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Twik is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Twik.  If not, see <http://www.gnu.org/licenses/>.
 */

var profileList;
var profilesLoaded = false;
var profilesLoadedCallback;

// Get profile list
profileList = new ProfileList();
profileList.getFromStorage(function() {
  if (profileList.count() == 0) {
    profileList.createDefaultProfile(onProfilesLoaded);
  } else {
    onProfilesLoaded();
  }
});

function onProfilesLoaded() {
  profilesLoaded = true;
  if (profilesLoadedCallback != null) {
    profilesLoadedCallback();
  };
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace == "sync") {
    if (changes.syncPrivateKeys != null) {
      profileList.syncPrivateKeys = changes[key].newValue;
    }
    profileList.getFromStorage(null);
  }
});

function setProfilesLoadedCallback(callback) {
  if (profilesLoaded) {
    callback();
  } else {
    profilesLoadedCallback = callback;
  }
}

function selectProfile(url, key) {
  profileList.setProfileForSite(getSite(url), key, function() {
    // Update settings in content script
    updateContentScript(url);
  });
}

function getSelectedProfile(url) {
  return profileList.getProfileForSite(getSite(url));
}

function updateContentScript(url) {
  chrome.tabs.query(
    {active: true, currentWindow: true},
    function(tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          type: MESSAGES.UPDATE_SETTINGS,
          settings: getSiteSettings(url)
        },
        null);
    }
  );
}

function getSiteSettings(url) {
  site = getSite(url);
  var profile = profileList.getProfile(getSelectedProfile(url));
  var data = {
    site: site,
    color: profile.color,
    private_key: profile.private_key
  };
  
  if (profile.sites[data.site] != null) {
    data['tag'] = profile.sites[data.site].tag;
    data['password_length'] = profile.tags[data.tag].password_length;
    data['password_type'] = profile.tags[data.tag].password_type;
    data['enabled_inputs'] = profile.sites[data.site].enabled_inputs;
  } else {
    // Use default profile settings
    data.tag = site;
    data.password_length = profile.password_length;
    data.password_type = profile.password_type;
    data['enabled_inputs'] = [];
  }
  
  return data;
}

function updateSiteSettings(url, settings, updateContent) {
  if (settings == null) {
    settings = getSiteSettings(url);
  }
  
  var site = getSite(url);
  var profileKey = getSelectedProfile(url);
  var profile = profileList.getProfile(profileKey);
  
  // Update enabled inputs if specified
  var enabled_inputs;
  if (settings.hasOwnProperty('enabled_inputs')) {
    enabled_inputs = settings['enabled_inputs'];
  } else if (profile.sites[site] != null && profile.sites[site].enabled_inputs != null) {
    enabled_inputs = profile.sites[site].enabled_inputs;
  } else {
    enabled_inputs = [];
  }

  profileList.setSiteSettings(profileKey, site, settings.tag, enabled_inputs);
  profileList.setTagSettings(profileKey, settings.tag, settings.password_length, settings.password_type);

  profileList.setToStorage(function() {
    // Update content script if necessary
    if (updateContent) {
      updateContentScript(url);
    }
  });
}

// Listen for requests of content script
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    switch (request.type) {
      case MESSAGES.GET_SETTINGS:
        sendResponse({
          type: MESSAGES.UPDATE_SETTINGS,
          settings: getSiteSettings(request.url)
        });
        break;
      case MESSAGES.SAVE_PROFILE:
        // Save current settings
        updateSiteSettings(request.url, null, false);
        break;
      case MESSAGES.ENABLE_INPUT:
        settings = getSiteSettings(request.url);
        var index = settings['enabled_inputs'].indexOf(request.id);
        if (index == -1) {
          var length = settings['enabled_inputs'].length;
          settings['enabled_inputs'][length] = request.id;
          updateSiteSettings(request.url, settings, false);
        }
        break;
      case MESSAGES.DISABLE_INPUT:
        settings = getSiteSettings(request.url);
        var index = settings['enabled_inputs'].indexOf(request.id);
        if (index > -1) {
          settings['enabled_inputs'].splice(index, 1);
          updateSiteSettings(request.url, settings, false);
        }
        break;
    }
  }
);
