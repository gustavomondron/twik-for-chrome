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

var DB_VERSION = 2;

/*
  Provide mechanisms to read and modify all the data used in Twik
*/
function ProfileList() {
  this.list = {}; // List of profiles
  this.siteProfiles = {}; // Default profile for each website
  this.syncPrivateKeys; // Sync/local storage for private keys
  this.dbVersion = 1; // Version of database
}

/*
  Load data from storage
*/
ProfileList.prototype.getFromStorage = function(callback) {
  var ref = this;
  chrome.storage.sync.get(null,
    function(items) {
      var siteProfiles = items.site_profiles;
      ref.syncPrivateKeys = items.sync_private_keys;
      var profiles = items.profiles;

      if (items.db_version != null) {
        ref.dbVersion = items.db_version;
      }

      if (siteProfiles != null) {
        ref.siteProfiles = siteProfiles;
      }

      // Get private keys from local storage if they are not synced
      if (!ref.syncPrivateKeys && profiles != null) {
        chrome.storage.local.get('private_keys', function(localItems)  {
          if (localItems.private_keys != null) {
            keys = Object.keys(profiles);
            profileCount = keys.length;
            for (i = 0; i < profileCount; i++) {
              // Be careful: database v2 introduces a change in private keys indexes for local storage
              if (this.dbVersion < 2) {
                profiles[keys[i]].private_key = localItems.private_keys[i];
              } else {
                profiles[keys[i]].private_key = localItems.private_keys[keys[i]];
              }
            }
          }
          // Clone profiles object
          ref.list = jQuery.extend({}, profiles);
          if (callback != null) {
            callback();
          }
        });
      } else {
        // Clone profiles object
        ref.list = jQuery.extend({}, profiles);
        if (callback != null) {
          callback();
        }
      }
    }
  );
}

/*
  Get the count of profiles
*/
ProfileList.prototype.count = function() {
  return this.getKeys().length;
}

/*
  Get a profile
  Args:
    key: the profile key (identifier)
*/
ProfileList.prototype.getProfile = function(key) {
  return this.list[key];
}

/*
  Get the list of profile keys (identifiers)
*/
ProfileList.prototype.getKeys = function() {
  return Object.keys(this.list);
}

/*
  Update a profile or add a new one
  Args:
    key: the profile key
    profile: object containing the profile data
*/
ProfileList.prototype.setProfile = function(key, profile) {
  this.list[key] = profile;
}

/*
  Remove a profile
  Args:
    key: the profile key
*/
ProfileList.prototype.removeProfile = function(key) {
  if ($.inArray(key, this.getKeys()) != -1) {
    delete this.list[key];
  }
}

/*
  Get a new profile key (the key is a unique index)
*/
ProfileList.prototype.getNewKey = function() {
  var keys = this.getKeys();
  var newKey = "0";
  if (keys.length > 0) {
    newKey = parseInt(keys[keys.length - 1]) + 1;
  }
  return newKey;
}

/*
  Get the list of private keys
*/
ProfileList.prototype.getPrivateKeys = function() {
  privateKeys = {};
  var keys = this.getKeys();
  for (i = 0; i < keys.length; i++) {
    privateKeys[keys[i]] = this.getProfile(keys[i]).private_key;
  }
  return privateKeys;
}

/*
  Saves the data to storage
  Args:
    callback: function called when the process is completed
*/
ProfileList.prototype.setToStorage = function(callback) {
  var ref = this;
  var profilesToStorage;
  if (this.syncPrivateKeys) {
    profilesToStorage = this.list;
  } else {
    keys = this.getKeys();
    // Clone object
    profilesToStorage = JSON.parse(JSON.stringify(this.list));
    for (var i = 0; i < keys.length; i++) {
      profilesToStorage[keys[i]].private_key = '';
    }
  }

  chrome.storage.sync.set({
    db_version: DB_VERSION,
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

/*
  Create the default profile and saves it to storage
  Args:
    callback: function called when the process is completed
*/
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

/*
  Set the profile which is selected by default for a website in particular
  Args:
    site: website domain
    key: profile key
    callback: function called when the process is completed
*/
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

/*
  Get the profile which should be selected by default for a website in particular
  Args:
    site: website domain
*/
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

/*
  Get whether private keys are synced
*/
ProfileList.prototype.getSyncPrivateKeys = function() {
  return this.syncPrivateKeys;
}

// ---------------- END OF ProfileList ----------------- //

