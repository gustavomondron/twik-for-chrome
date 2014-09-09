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

var settings; // Current password generation settings
var passwordActivators = []; // List of passwords activators (1 per pw. field)
var inputIndex = 0;
var url = location.href;

// --------------------------
// START OF PasswordActivator
//
// Object which manages a password input
function PasswordActivator(passwordInput) {  
  this.passwordInput = passwordInput;
  if (passwordInput.attr('id') == "") {
    this.id = "twik_" + inputIndex++;
  } else {
    this.id = passwordInput.attr('id');
  }
  this.twikCheckbox = null;
  enabled_inputs = settings['enabled_inputs'];
  
  this.twikEnabled = enabled_inputs.indexOf(this.id) >= 0;

  this.currentPassword = ''; // Don't hash what is already hashed!
  this.inputBackgroundColor = $(passwordInput).css('background-color');
  this.tipTextDisabled = '<span class="twik-tip"><input type="checkbox" class="twik-checkbox"/> twik </span>';
    this.tipTextEnabled = '<span class="twik-tip"><input type="checkbox" class="twik-checkbox" checked="checked"/> twik </span>';
  this.init();
}

PasswordActivator.prototype.init = function() {
  // Get reference to password activator, because jQuery overloads "this"
  var activator = this;
  // Add Twik qtip
  $(this.passwordInput).qtip ({
    content: {
      text: activator.twikEnabled ?
        activator.tipTextEnabled :
        activator.tipTextDisabled
    },
    position: { my: 'top right', at: 'bottom right' },
    show: {
      event: 'focus mouseenter',
      solo: true
    },
    hide: {
      fixed: true,
      event: 'unfocus'
    },
    style: {
      classes: 'qtip-green'
    },
    events: {
      visible: function (event, api) {
        if (null != activator.twikCheckbox) {
          return;
        }
        activator.twikCheckbox = $(".twik-checkbox", api.elements.content).get(0);
        activator.twikCheckbox.addEventListener("click", function () {
          activator.toggleTwik(true);
        });
      }
    }
  });
  
  $(this.passwordInput).change(function() {
    if (activator.twikEnabled && $(this).val() != activator.currentPassword) {
      // Password changed by user, we should recalculate it
      activator.updatePassword();
    }
  });
  
  $(this.passwordInput).blur(function() {
    if (activator.twikEnabled && $(this).val() != activator.currentPassword) {
      activator.updatePassword();
    }
  });
  
  if (this.twikEnabled) {
    this.twikEnabled = false; // Not really enabled at the beginning :-)
    this.toggleTwik(false);
  }
}

PasswordActivator.prototype.toggleTwik = function(sendMessage) {
  this.twikEnabled = !this.twikEnabled;
  if (this.twikEnabled) {
    $(this.passwordInput).css('background-color', PROFILE_COLORS[settings.color]);
    $(this.passwordInput).addClass('twik-enabled');
    this.currentPassword = this.updatePassword($(this.passwordInput));
    // Save the site in the case that this is the first use
    chrome.runtime.sendMessage(
      {
        type: MESSAGES.SAVE_PROFILE,
        url: url
      },
      null);
    if (sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: MESSAGES.ENABLE_INPUT,
          url: url,
          id: this.id
        },
        null
      );
    }
  } else {
    $(this.passwordInput).css('background-color', this.inputBackgroundColor);
    $(this.passwordInput).removeClass('twik-enabled');
    if (sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: MESSAGES.DISABLE_INPUT,
          url: url,
          id: this.id
        },
        null
      );
    }
  }
}

PasswordActivator.prototype.updatePassword = function() {
  if ($(this.passwordInput).val() != "") {
    var passwordHasher = new PasswordHasher();
    var sitePassword = passwordHasher.hashPassword(
      settings.tag,
      $(this.passwordInput).val(),
      settings.private_key,
      settings.password_length,
      settings.password_type
    );
    $(this.passwordInput).val(sitePassword);
    this.currentPassword = sitePassword;
  } else {
    this.currentPassword = "";
  }
}

PasswordActivator.prototype.isEnabled = function() {
  return this.twikEnabled;
}

PasswordActivator.prototype.updateBackgroundColor = function() {
  if (this.twikEnabled) {
    $(this.passwordInput).css('background-color', PROFILE_COLORS[settings.color]);
  }
}

// END OF PasswordActivator
// ------------------------

function activatePasswordInputs() {
  $("input[type=password]").each (function(index) {
    activator = new PasswordActivator($(this));
    passwordActivators[passwordActivators.length] = activator;
    activator.init();
  });
}

function updatePasswordInputs() {
  for (i = 0; i < passwordActivators.length; i++) {
    activator = passwordActivators[i];
    if (activator.isEnabled()) {
      activator.updateBackgroundColor();
      activator.updatePassword();
    }
  }
}

// SCRIPT START

// Ask for site settings
chrome.runtime.sendMessage(
  {
    type: MESSAGES.GET_SETTINGS,
    url: url
  },
  function(response) {
    settings = response.settings;
    activatePasswordInputs();
  }
);

// Listen for updates in settings
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.type == MESSAGES.UPDATE_SETTINGS) {
      settings = request.settings;
      updatePasswordInputs();
    }
  }
);
