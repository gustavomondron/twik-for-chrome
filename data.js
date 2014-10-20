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

function ProfileList() {
  this.list = {};
  this.siteProfiles = {};
  this.syncPrivateKeys;
}

ProfileList.prototype.getFromStorage = function(callback) {
  var ref = this;
  chrome.storage.sync.get(null,
    function(items) {
      var siteProfiles = items.site_profiles;
      ref.syncPrivateKeys = items.sync_private_keys;
      var profiles = items.profiles;

      if (siteProfiles != null) {
        ref.siteProfiles = siteProfiles;
      }
      
      if (!ref.syncPrivateKeys && profiles != null) {
        // Get keys from local storage
        chrome.storage.local.get('private_keys', function(localItems)  {
          if (localItems.private_keys != null) {
            keys = Object.keys(profiles);
            profileCount = keys.length;
            for (i = 0; i < profileCount; i++) {
              profiles[keys[i]].private_key = localItems.private_keys[i];
            }
          }
          ref.list = jQuery.extend({}, profiles);
          if (callback != null) {
            callback();
          }
        });
      } else {
        ref.list = jQuery.extend({}, profiles);
        if (callback != null) {
          callback();
        }
      }
    }
  );
}

ProfileList.prototype.count = function() {
  return this.getKeys().length;
}

ProfileList.prototype.getProfile = function(key) {
  return this.list[key];
}

ProfileList.prototype.getKeys = function() {
  return Object.keys(this.list);
}

ProfileList.prototype.setProfile = function(key, profile) {
  this.list[key] = profile;
}

ProfileList.prototype.removeProfile = function(key) {
  if ($.inArray(key, this.getKeys()) != -1) {
    delete this.list[key];
  }
}

/*
  Get a new profile key (the key is an unique index)
*/
ProfileList.prototype.getNewKey = function() {
  var keys = this.getKeys();
  var newKey = "0";
  if (keys.length > 0) {
    newKey = parseInt(keys[keys.length - 1]) + 1;
  }
  return newKey;
}

ProfileList.prototype.getPrivateKeys = function() {
  privateKeys = [];
  var keys = this.getKeys();
  for (i = 0; i < keys.length; i++) {
    privateKeys[i] = this.getProfile(keys[i]).private_key;
  }
  return privateKeys;
}

ProfileList.prototype.setToStorage = function(callback) {
  var ref = this;
  var profilesToStorage;
  if (this.syncPrivateKeys) {
    profilesToStorage = this.list;
  } else {
    keys = this.getKeys();
    profilesToStorage = JSON.parse(JSON.stringify(this.list));
    for (var i = 0; i < keys.length; i++) {
      profilesToStorage[keys[i]].private_key = '';
    }
  }

  chrome.storage.sync.set({
    profiles: profilesToStorage,
    sync_private_keys: ref.syncPrivateKeys,
    site_profiles: ref.siteProfiles
  }, function() {
    chrome.storage.local.set({
      private_keys: ref.getPrivateKeys()
    }, function() {
      if (callback != null) {
        callback();
      }
    });
  });
}

ProfileList.prototype.createDefaultProfile = function(callback) {
  var profile = {
    name: chrome.i18n.getMessage('default'),
    private_key: generatePrivateKey(),
    password_type: PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS,
    password_length: 12,
    color: 1,
    tags: {},
    sites: {}
  };
  
  this.list[this.getNewKey()] = profile;
  this.syncPrivateKeys = false;
  var ref = this;
  
  chrome.storage.sync.set({
     profiles: [ profile ],
     sync_private_keys: false,
     site_profiles: {}
    }, function() {
      chrome.storage.local.set(
        { private_keys: ref.getPrivateKeys() },
        function() {
          if (callback != null) {
            callback();
          }
        }
      );
    }
  );
}

ProfileList.prototype.setProfileForSite = function(site, key, callback) {
  var ref = this;
  if ($.inArray(key, this.getKeys()) != -1) {
    this.siteProfiles[site] = key;
    chrome.storage.sync.set(
      { site_profiles: ref.siteProfiles },
      function() {
        if (callback != null) {
          callback();
        }
      }
    );
  }
}

ProfileList.prototype.getProfileForSite = function(site) {
  var keys = this.getKeys();
  var profileKey = keys[0];
  if (this.siteProfiles[site] != null) {
    profileKey = this.siteProfiles[site];
    // Check that profileKey exists. In other case, use the first profile
    var keys = this.getKeys();
    if ($.inArray(profileKey, keys) == -1) {
      profileKey = keys[0];
      this.setProfileForSite(site, profileKey, null);
    }
  }

  return profileKey;
}

ProfileList.prototype.getSyncPrivateKeys = function() {
  return this.syncPrivateKeys;
}

// ---------------- END OF ProfileList ----------------- //

