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

var bgPage;
var colorPalette = new ColorPalette('color-palette', PROFILE_COLORS, 0, function(value) {
    var profileKey = $('#profile').val();
    bgPage.profileList.getProfile(profileKey).color = value;
    saveChanges(false, profileKey);
  });

window.onload = function() {
  localizePage();
  init();
}

function setupUI() {
  colorPalette.init();
  setSyncPrivateKeys();
  populatePasswordLength();
  populatePasswordType();
  populateProfileList(-1);
  
  $('#profile').change(function() {
    selectProfile($('#profile').val());
  });
  
  $('#button_add_profile').click(function() {
    addProfile();
    var keys = bgPage.profileList.getKeys();
    saveChanges(true, keys[keys.length - 1]);
  });
  
  $('#button_remove_profile').click(function() {
    var keys = bgPage.profileList.getKeys();
    var index = $.inArray($('#profile').val(), keys);
    var newSelectedKey;
    removeProfile($('#profile').val());
    if (index > 0) {
      newSelectedKey = keys[index - 1];
    } else {
      newSelectedKey = keys[0];
    }
    saveChanges(true, newSelectedKey);
  });
  
  $('#sync_private_keys').change(function() {
    saveChanges(false, -1);
  })
  
  $('#name').change(function() {
    bgPage.profileList.getProfile($('#profile').val()).name = $('#name').val();
    saveChanges(true, $('#profile').val());
  });
  
  $('#private_key, #password_length, #password_type').change(function() {
    var profile = bgPage.profileList.getProfile($('#profile').val());
    profile.private_key = $('#private_key').val();
    profile.password_length = $('#password_length').val();
    profile.password_type = $('#password_type').val();
    saveChanges(false, -1);
  });
}

function init() {
  bgPage = chrome.extension.getBackgroundPage();
  if (bgPage == null || bgPage.document.readyState != 'complete') {
    // Try again
    setTimeout(function() {
      init();
    }, 100);
  } else {
    bgPage.setProfilesLoadedCallback(setupUI);
  }
}

function selectProfile(key) {
  var profile = bgPage.profileList.getProfile(key);
  $('#name').val(profile.name);
  $('#private_key').val(profile.private_key);
  $('#password_length').val(profile.password_length);
  $('#password_type').val(profile.password_type);
  $('#profile').val(key);
  colorPalette.selectColor(profile.color);
}

function populateProfileList(key) {
  var profileCount = bgPage.profileList.count();
  var keys = bgPage.profileList.getKeys();
  $('#button_remove_profile').prop('disabled', profileCount < 2);
  $('#profile').find('option').remove();
  for (i = 0; i < profileCount; i++) {
    var profile = bgPage.profileList.getProfile(keys[i]);
    $('#profile').append(new Option(profile.name, keys[i]));
  }
  
  if ($.inArray(key, keys) != -1) {
    selectProfile(key);
  } else {
    selectProfile(keys[0]);
  }
}

function setSyncPrivateKeys() {
  chrome.storage.sync.get('sync_private_keys', function(items) {
    if (items.sync_private_keys) {
      $('#sync_private_keys').prop('checked', 'checked');
    }
  });
}

function addProfile() {
    var profileCount = bgPage.profileList.count();
    bgPage.profileList.setProfile(profileCount, {
      name: getNewProfileName(),
      private_key: generatePrivateKey(),
      password_type: PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS,
      password_length: 12,
      color: 0,
      tags: {},
      sites: {}
    });
    
    saveChanges(true, profileCount);
}

function removeProfile(key) {
  bgPage.profileList.removeProfile(key);
}

function saveChanges(updateList, index) {
  bgPage.profileList.syncPrivateKeys = $('#sync_private_keys').prop('checked');
  bgPage.profileList.setToStorage(function() {
    if (updateList) {
      populateProfileList(index);
    }
  });
}

function getNewProfileName() {
  var candidate_suffix = 1;
  var candidate_prefix = chrome.i18n.getMessage('new_profile', null);
  var candidate_name = candidate_prefix;
  var keys = bgPage.profileList.getKeys();
  while (true) {
    i = 0;
    do {
      found = bgPage.profileList.getProfile(keys[i]).name === candidate_name;
      i++;
    } while (!found && i < keys.length);
    if (!found) {
      return candidate_name;
    } else {
      candidate_name = candidate_prefix + ' (' + candidate_suffix + ')';
      candidate_suffix++;
    }
  }
}
