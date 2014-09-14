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
            profileCount = Object.keys(profiles).length;
            for (i = 0; i < profileCount; i++) {
              profiles[i].private_key = localItems.private_keys[i];
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
  return Object.keys(this.list).length;
}

ProfileList.prototype.getProfile = function(index) {
  return this.list[index];
}

ProfileList.prototype.setProfile = function(index, profile) {
  this.list[index] = profile;
}

ProfileList.prototype.removeProfile = function(index) {
  if (index < this.count()) {
    delete this.list[index];
  }
}

ProfileList.prototype.getPrivateKeys = function() {
  privateKeys = [];
  for (i = 0; i < this.count(); i++) {
    privateKeys[i] = this.list[i].private_key;
  }
  return privateKeys;
}

ProfileList.prototype.setToStorage = function(callback) {
  var ref = this;
  var profilesToStorage;
  if (this.syncPrivateKeys) {
    profilesToStorage = this.list;
  } else {
    profilesToStorage = JSON.parse(JSON.stringify(this.list));
    for (var i = 0; i < this.count(); i++) {
      profilesToStorage[i].private_key = '';
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
  
  this.list[0] = profile;
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

ProfileList.prototype.setProfileForSite = function(site, profile_index, callback) {
  var ref = this;
  if (profile_index >= 0 && profile_index < this.count()) {
    this.siteProfiles[site] = profile_index;
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
  var profileIndex = 0;
  if (this.siteProfiles[site] != null) {
    profileIndex = this.siteProfiles[site];
    // Check that profileIndex is valid
    if (profileIndex >= this.count()) {
      profileIndex = 0;
      this.setProfileForSite(site, 0, null);
    }
  }
  return profileIndex;
}

ProfileList.prototype.getSyncPrivateKeys = function() {
  return this.syncPrivateKeys;
}

// ---------------- END OF ProfileList ----------------- //

