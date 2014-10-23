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
var PATTERN_SITE_PROFILE = /^site_profile_(.+)$/;
var PATTERN_SITE_SETTINGS = /^site_settings_([0-9]?)_(.+)$/
var PATTERN_TAG_SETTINGS = /^tag_settings_([0-9]?)_(.+)$/
/*
  Provide mechanisms to read and modify all the data used in Twik
*/
function ProfileList() {
  this.list = {}; // List of profiles
  this.siteProfiles = {}; // Default profile for each website
  this.syncPrivateKeys; // Sync/local storage for private keys
  this.dbVersion = 1; // Database version (1 unless overwritten)
}

/*
  Load data from storage
*/
ProfileList.prototype.getFromStorage = function(callback) {
  var ref = this;
  chrome.storage.sync.get(null,
    function(items) {
      ref.syncPrivateKeys = items.sync_private_keys;
      var profiles = items.profiles;

      if (items.db_version != null) {
        ref.dbVersion = items.db_version;
      }

      // Get sites' tag and enabled inputs for each profile
      if (ref.dbVersion >= 2) {
        // Sites settings are stored in distinct objects
        // Initialize sites lists
        for(profileKey in profiles) {
          profiles[profileKey].sites = {};
        }
        Object.keys(items).forEach(function(key) {
          if (key.indexOf("site_settings_") == 0) {
            var keyParts = PATTERN_SITE_SETTINGS.exec(key);
            var profileKey = keyParts[1];
            var site = keyParts[2];
            profiles[profileKey].sites[site] = items[key];
          }
        });
      }

      // Get tag specific settings for each profile
      if (ref.dbVersion >= 2) {
        for (profileKey in profiles) {
          profiles[profileKey].tags = {};
        }
        Object.keys(items).forEach(function(key) {
          if (key.indexOf("tag_settings_") == 0) {
            var keyParts = PATTERN_TAG_SETTINGS.exec(key);
            var profileKey = keyParts[1];
            var tag = keyParts [2];
            profiles[profileKey].tags[tag] = items[key];
          }
        });
      }

      // Get default profile for each site
      if (ref.dbVersion < 2 && items.site_profiles != null) {
        ref.siteProfiles = items.site_profiles;
      } else if (ref.dbVersion >= 2) {
        ref.siteProfiles = {};
        Object.keys(items).forEach(function(key) {
          if (key.indexOf("site_profile_") == 0) {
            var site = PATTERN_SITE_PROFILE.exec(key)[1];
            ref.siteProfiles[site] = items[key];
          }
        });
      }

      // Get private keys from local storage if they are not synced
      if (!ref.syncPrivateKeys && profiles != null) {
        chrome.storage.local.get('private_keys', function(localItems)  {
          if (localItems.private_keys != null) {
            keys = Object.keys(profiles);
            profileCount = keys.length;
            for (i = 0; i < profileCount; i++) {
              // Be careful: database v2 introduces a change in private keys indexes for local storage
              if (ref.dbVersion < 2) {
                profiles[keys[i]].private_key = localItems.private_keys[i];
              } else {
                profiles[keys[i]].private_key = localItems.private_keys[keys[i]];
              }
            }
          }

          // Clone profiles object
          ref.list = jQuery.extend({}, profiles);
          
          // Update database if necessary and execute callback
          ref.updateDatabase(callback);
        });
      } else {
        // Clone profiles object
        ref.list = jQuery.extend({}, profiles);

        // Update database if necessary and execute callback
        ref.updateDatabase(callback);
      }
    }
  );
}

/*
  Force a database version if it is outdated
  Args: 
    callback: function called when the process is completed
*/
ProfileList.prototype.updateDatabase = function(callback) {
  if (this.dbVersion < DB_VERSION) {
    if (this.dbVersion == 1) {
      // Remove legacy objects
      var ref = this;
      chrome.storage.sync.remove("site_profiles", function() {
        ref.setToStorage(callback);
      });
    } else {
      this.setToStorage(callback);
    }
  } else if (callback != null) {
    callback();
  }
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
  Remove a profile.
  WARNING: This change is automatically updated in storage.
  Args:
    key: the profile key
*/
ProfileList.prototype.removeProfile = function(key, callback) {
  var ref = this;
  if ($.inArray(key, this.getKeys()) != -1) {
    var objectsToRemove = [];
    // Remove site-specific settings for this profile
    for (site in this.list[key].sites) {
      objectsToRemove.push("site_settings_" + key + "_" + site);
    }
    // Remove tag-specific settings for this profile
    for (tag in this.list[key].tags) {
      objectsToRemove.push("tag_settings_" + key + "_" + tag);
    }
    chrome.storage.sync.remove(objectsToRemove, function() {
      delete ref.list[key];
      ref.setToStorage(callback);
    });
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
  Update site settings
  Args:
    profileKey: profile key
    site: site domain
    tag: tag name
    enabled_inputs: list of password inputs managed by Twik
*/
ProfileList.prototype.setSiteSettings = function(profileKey, site, tag, enabled_inputs) {
  if (this.list[profileKey].sites[site] != null) {
    // Check if tag has changed
    var oldTag = this.list[profileKey].sites[site].tag;
    if (oldTag != tag) {
      // Remove old tag if it is no longer used
      var used = false;
      for (s in this.list[profileKey].sites) {
        used = s != site && oldTag == this.list[profileKey].sites[s].tag;
        if (used) {
          break;
        }
      }

      // Add new tag
      this.list[profileKey].tags[tag] = {
        password_length: oldTag.password_length,
        password_type: oldTag.password_type
      };
        
      // Delete old tag if it is no longer used
      if (!used) {
        delete this.list[profileKey].tags[oldTag];
        chrome.storage.sync.remove("tag_settings_" + profileKey + "_" + oldTag, null);
      }
    }
  }

  this.list[profileKey].sites[site] = {
    tag: tag,
    enabled_inputs: enabled_inputs
  };
}

/*
  Update tag settings
  Args:
    profileKey: profile key
    tag: tag name
    passwordLength: length of password
    passwordType: type of password
*/
ProfileList.prototype.setTagSettings = function(profileKey, tag, passwordLength, passwordType) {
  this.list[profileKey].tags[tag] = {
    password_length: passwordLength,
    password_type: passwordType
  };
}

/*
  Saves the data to storage
  Args:
    callback: function called when the process is completed
*/
ProfileList.prototype.setToStorage = function(callback) {
  var ref = this;
  var profilesToStorage;
  
  // Remove private keys from profiles sync if necessary
  // Clone object
  profilesToStorage = JSON.parse(JSON.stringify(this.list));
  if (!this.syncPrivateKeys) {
    for (profileKey in this.list) {
      profilesToStorage[profileKey].private_key = '';
    }
  }

  // Initialize objects to sync
  var objectsToSync = {
    db_version: DB_VERSION,
    sync_private_keys: ref.syncPrivateKeys,
  };

  // Separate site-specific tag and enabled inputs in distinct objects
  for (profileKey in profilesToStorage) {
    var sites = profilesToStorage[profileKey].sites;
    for (site in sites) {
      objectsToSync["site_settings_" + profileKey + "_" + site] = sites[site];
    }
    delete profilesToStorage[profileKey].sites;
  }

  // Separate tag-specific settings in distinct objets
  for (profileKey in profilesToStorage) {
    var tags = profilesToStorage[profileKey].tags;
    for (tag in tags) {
      objectsToSync["tag_settings_" + profileKey + "_" + tag] = tags[tag];
    }
    delete profilesToStorage[profileKey].tags;
  }

  // Separate default profile for each site in distinct objects
  for (site in ref.siteProfiles) {
    objectsToSync["site_profile_" + site] = ref.siteProfiles[site];
  }

  objectsToSync['profiles'] = profilesToStorage;

  chrome.storage.sync.set(objectsToSync, function() {
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
  Create the default profile and save it to storage
  Args:
    callback: function called when the process is completed
*/
ProfileList.prototype.createDefaultProfile = function(callback) {
  var profile = {
    name: chrome.i18n.getMessage('default'),
    private_key: generatePrivateKey(),
    password_type: PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS,
    password_length: 12,
    color: 1
  };

  // Add attributes for this profile list (not for storage)  
  var thisProfile = JSON.parse(JSON.stringify(profile));
  thisProfile.sites = {};
  thisProfile.tags = {};
  this.list[this.getNewKey()] = thisProfile;

  // Default: do not sync private keys
  this.syncPrivateKeys = false;

  var ref = this;  
  chrome.storage.sync.set({
     profiles: [ profile ],
     sync_private_keys: false
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
    var objectToSync = {};
    objectToSync["site_profile_" + site] = key;
    chrome.storage.sync.set(
      objectToSync,
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
