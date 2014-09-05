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

var profiles = [];

window.onload = function() {
  localizePage();
  populatePasswordLength();
  populatePasswordType();
  populate_color_palette(0);
  load_profiles();
  
  $('#profile').change(function() {
    select_profile($('#profile').val());
  });
  
  $('#button_add_profile').click(function() {
    add_profile();
  });
  
  $('#button_remove_profile').click(function() {
    remove_profile($('#profile').val());
  });
  
  $('#button_save_changes').click(function() {
    save_profile($('#profile').val());
  })
}

function populate_color_palette(value) {
  for (i = 0; i < PROFILE_COLORS.length; i++) {
    var button = $('<button/>');
    button.css('background-color', PROFILE_COLORS[i]);
    button.val(i);
    if (i == value) {
      button.addClass('selected');
    }
    button.click(function() {
      select_color($(this).val());
    });
    $('#color-palette').append(button);
  }
}

function select_color(index) {
  profiles[$('#profile').val()].color = index;
  $('#color-palette').find('button').removeClass('selected');
  buttons = $('#color-palette button:eq(' + index + ')').addClass('selected');
}
function select_profile(index) {
  $('#name').val(profiles[index].name);
  $('#private_key').val(profiles[index].private_key);
  $('#password_length').val(profiles[index].password_length);
  $('#password_type').val(profiles[index].password_type);
  $('#profile').val(index);
  select_color(profiles[index].color);
}

function load_profiles() {
  chrome.storage.sync.get('profiles', function(items) {
    $('#profile').find('option').remove().end();
    if (Object.keys(items).length == 0) {
      create_default_profile();
    } else {
      profiles = items.profiles;
      populate_profile_list(0);
    }
  });
}

function populate_profile_list(value) {
  $('#button_remove_profile').prop('disabled', profiles.length < 2);
  $('#profile').find('option').remove();
  for (i = 0; i < profiles.length; i++) {
    $('#profile').append(new Option(profiles[i]['name'], i));
  }
  
  select_profile(value);
}

function create_default_profile() {
  chrome.storage.sync.set({
    profiles: [
      {
        name: chrome.i18n.getMessage('default'),
        private_key: generatePrivateKey(),
        password_type: PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS,
        password_length: 12,
        color: 1,
        tags: {},
        sites: {}
      }
    ]
  }, function() {
    load_profiles();
  })
}

function add_profile() {
    profiles.push({
      name: get_new_profile_name(),
      private_key: generatePrivateKey(),
      password_type: PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS,
      password_length: 12,
      color: 1,
      tags: {},
      sites: {}
    });
    
    chrome.storage.sync.set({
      profiles: profiles
    }, function() {
      populate_profile_list(profiles.length - 1);
    });
}

function remove_profile(index) {
  if (index >= 0 && index < profiles.length) {
    profiles.splice(index, 1);
    chrome.storage.sync.set({
      profiles: profiles
    }, function() {
      populate_profile_list(index - 1 >= 0 ? index - 1 : 0);
    });
  }
}

function save_profile(index) {
  profiles[index].name = $('#name').val();
  profiles[index].private_key = $('#private_key').val();
  profiles[index].password_length = $('#password_length').val();
  profiles[index].password_type = $('#password_type').val();
  chrome.storage.sync.set({
    profiles: profiles
  }, function() {
    populate_profile_list(index);
  });
}

function clear() {
  chrome.storage.sync.clear(function() {
    console.log('Storage cleared');
  });
}

function get_new_profile_name() {
  candidate_suffix = 1;
  candidate_prefix = chrome.i18n.getMessage('new_profile', null);
  candidate_name = candidate_prefix;
  while (true) {
    i = 0;
    do {
      found = false;
      found = profiles[i].name === candidate_name;
      i++;
    } while (!found && i < profiles.length);
    if (!found) {
      return candidate_name;
    } else {
      candidate_name = candidate_prefix + ' (' + candidate_suffix + ')';
      candidate_suffix++;
    }
  }
}
