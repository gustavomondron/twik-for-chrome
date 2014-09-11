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

var bgPage = chrome.extension.getBackgroundPage();
var sync_private_keys = false;
var colorPalette = new ColorPalette('color-palette', PROFILE_COLORS, 0, function(value) {
    bgPage.profileList.getProfile($('#profile').val()).color = value;
    saveChanges(false, $('#profile').val());
  });
  
window.onload = function() {
  localizePage();
  colorPalette.init();
  populatePasswordLength();
  populatePasswordType();
  populateProfileList(0);
  setSyncPrivateKeys();
  
  $('#profile').change(function() {
    selectProfile($('#profile').val());
  });
  
  $('#button_add_profile').click(function() {
    addProfile();
    saveChanges(true, bgPage.profileList.count() - 1);
  });
  
  $('#button_remove_profile').click(function() {
    index = $('#profile').val();
    removeProfile(index);
    var newIndex = index - 1 >= 0 ? index - 1 : 0;
    saveChanges(true, newIndex);
  });
  
  $('#sync_private_keys').change(function() {
    saveChanges(false, 0);
  })
  
  $('#name').change(function() {
    bgPage.profileList.getProfile($('#profile').val()).name = $('#name').val();
    saveChanges(true, $('#profile').val());
  });
  
  $('#private_key, #password_length, #password_type').change(function() {
    profile = bgPage.profileList.getProfile($('#profile').val());
    profile.private_key = $('#private_key').val();
    profile.password_length = $('#password_length').val();
    profile.password_type = $('#password_type').val();
    saveChanges(false, 0);
  });
}


function selectProfile(index) {
  var profile = bgPage.profileList.getProfile(index);
  $('#name').val(profile.name);
  $('#private_key').val(profile.private_key);
  $('#password_length').val(profile.password_length);
  $('#password_type').val(profile.password_type);
  $('#profile').val(index);
  colorPalette.selectColor(profile.color);
}

function populateProfileList(index) {
  var profileCount = bgPage.profileList.count();
  $('#button_remove_profile').prop('disabled', profileCount < 2);
  $('#profile').find('option').remove();
  for (i = 0; i < profileCount; i++) {
    var profile = bgPage.profileList.getProfile(i);
    $('#profile').append(new Option(profile.name, i));
  }
  
  if (index >= 0 && index < profileCount) {
    selectProfile(index);
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

function removeProfile(index) {
  bgPage.profileList.removeProfile(index);
}

function saveChanges(updateList, index) {
  syncPrivateKeys = $('#sync_private_keys').prop('checked');
  bgPage.profileList.setToStorage(syncPrivateKeys, function() {
    if (updateList) {
      populateProfileList(index);
    }
  });
}

function getNewProfileName() {
  var candidate_suffix = 1;
  var candidate_prefix = chrome.i18n.getMessage('new_profile', null);
  var candidate_name = candidate_prefix;
  var profileCount = bgPage.profileList.count();
  while (true) {
    i = 0;
    do {
      found = bgPage.profileList.getProfile(i).name === candidate_name;
      i++;
    } while (!found && i < profileCount);
    if (!found) {
      return candidate_name;
    } else {
      candidate_name = candidate_prefix + ' (' + candidate_suffix + ')';
      candidate_suffix++;
    }
  }
}
