/*
 * Copyright (C) 2014 Red Dye No. 2
 * Copyright (C) 2010-2014 Eric Woodruff
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

function generatePrivateKey() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace (/[xy]/g, function(c) {
    var r = Math.random() * 16|0
    var v = c == 'x' ? r : (r & 0x3|0x8);
    return v.toString(16);
  }).toUpperCase();
}

function getSite(url) {
  var split_at_first_dot = /(^[^.]+)\..*$/;
  var split_url = /^(https?:\/\/)(.+@)?([^:#\/]+)(:\d{2,5})?(\/.*)?$/;
  // 1 = protocol, 2 = auth, 3 = address, 4 = port, 5 = path
  // split_url is stolen from http://github.com/oncletom/tldjs
  var is_ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/;
  var is_dot_free_hostname = /^[^.]+$/;

  try {
    //if url badly formed, this will throw a type error, handled at (d)
    var address = split_url.exec(url)[3];                          // a
    if (is_ipv4.test(address) || is_dot_free_hostname.test(address)) {
      return address;                                            // b
    } else {
      //this shouldn't throw an error.
      //but just in case it does, handle it at (d)
      return split_at_first_dot.exec(tldjs.getDomain(address))[1]; // c
    }
  } catch (e) {
    return "chrome";                                               // d
  }
}

function populatePasswordLength() {
  for (i = 4; i <= 26; i++) {
    $('#password_length').append(new Option(i, i));
  }
}

function populatePasswordType() {
  $('#password_type').append(new Option(chrome.i18n.getMessage('alphanumeric_and_special_chars', null), PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS));
  $('#password_type').append(new Option(chrome.i18n.getMessage('alphanumeric', null), PASSWORD_TYPES.ALPHANUMERIC));
  $('#password_type').append(new Option(chrome.i18n.getMessage('numeric', null), PASSWORD_TYPES.NUMERIC));
}

function populateProfiles() {
  $('#profile').find('option').remove();
  bgPage = chrome.extension.getBackgroundPage();
  var keys = bgPage.profileList.getKeys();
  for(i = 0; i < keys.length; i++) {
    $('#profile').append(new Option(bgPage.profileList.getProfile(keys[i]).name, keys[i]));
  }
}
