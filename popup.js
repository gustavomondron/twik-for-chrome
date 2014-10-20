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

var url;

bgPage = chrome.extension.getBackgroundPage();

window.onload = function() {
  localizePage();
  populateProfiles();
  populatePasswordLength();
  populatePasswordType();
  
  // Select the profile and fill the settings
  chrome.tabs.getSelected(null, function(tab) {
    url = tab.url;
    var selectedProfile = bgPage.getSelectedProfile(url);
    $('#profile').val(selectedProfile);
    updateValues();
    setListeners();
  });
}

function updateValues() {
  settings = bgPage.getSiteSettings(url);
  $('#profile-color-marker').css('background-color', PROFILE_COLORS[settings.color]);
  $('#tag').val(settings.tag);
  $('#password_length').val(settings.password_length);
  $('#password_type').val(settings.password_type);
}

function setListeners() {
  $('#profile').change(function() {
    bgPage.selectProfile(url, $(this).val());
    updateValues();
  });
  
  $('#tag').change(function() { updateSiteSettings()} );
  $('#password_length').change(function() { updateSiteSettings()} );
  $('#password_type').change(function() { updateSiteSettings()} );
  $('#link-options').click(function() {
    chrome.tabs.create({ url: "options.html" });
  });
}

function updateSiteSettings() {
  settings = {
    tag: $('#tag').val(),
    password_length: $('#password_length').val(),
    password_type: $('#password_type').val()
  };
  bgPage.updateSiteSettings(url, settings, true);
}
