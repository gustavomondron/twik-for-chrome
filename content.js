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
  
  if (passwordInput.attr('id') == null || passwordInput.attr('id') == "") {
    this.id = "twik_" + inputIndex++;
  } else {
    this.id = passwordInput.attr('id');
  }
  
  this.twikEnableButton = null;
  enabled_inputs = settings['enabled_inputs'];
  this.twikEnabled = enabled_inputs.indexOf(this.id) >= 0;
  this.masterKey = '';
  this.inputBackground = $(passwordInput).css('background');
  this.tipText = '<div class="twik-tip"><button class="twik-button"/></div>';
  this.init();
}

PasswordActivator.prototype.init = function() {
  // Get reference to password activator, because jQuery overloads "this"
  var activator = this;
  // Add Twik qtip
  $(this.passwordInput).qtip ({
    content: {
      text: activator.tipText
    },
    position: {
      my: 'right top',
      at: 'right bottom',
    },
    show: {
      event: 'focus mouseenter',
      solo: true
    },
    hide: {
      fixed: true,
      event: 'unfocus'
    },
    style: {
      classes: 'qtip-green',
      tip: {
        corner: false
      }
    },
    events: {
      render: function (event, api) {
        if (null != activator.twikCheckbox) {
          return;
        }
        activator.twikEnableButton = $(".twik-button", api.elements.content).get(0);
        activator.twikEnableButton.addEventListener("click", function () {
          activator.toggleTwik(true);
        });
        if (!activator.twikEnabled) {
          $(activator.twikEnableButton).addClass("twik-button-disabled");
        }
      }
    }
  });
  
  $(this.passwordInput).focus(function() {
    $(this).val(activator.masterKey);
  });
  
  $(this.passwordInput).keyup(function() {
    activator.masterKey = $(this).val();
  });
  
  $(this.passwordInput).keydown(function(e) {
    if (e.which == 13 && activator.twikEnabled) {
      // Submitting form
      activator.updatePassword();
      return true;
    }
  })
  
  $(this.passwordInput).blur(function() {
    if (activator.twikEnabled) {
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
    this.passwordInput.get(0).style.setProperty('background', PROFILE_COLORS[settings.color], 'important');
    $(this.passwordInput).addClass('twik-enabled');
    this.currentPassword = this.updatePassword();
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

    if (this.twikEnableButton != null) {
      $(this.twikEnableButton).removeClass("twik-button-disabled");
    }
  } else {
    this.passwordInput.get(0).style.setProperty('background', this.inputBackground, 'important');
    $(this.passwordInput).removeClass('twik-enabled');
    $(this.passwordInput).val(this.masterKey);
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
    if (this.twikEnableButton != null) {
      $(this.twikEnableButton).addClass("twik-button-disabled");
    }
  }
}

PasswordActivator.prototype.updatePassword = function() {
  if (this.masterKey != '') {
    var passwordHasher = new PasswordHasher();
    var sitePassword = passwordHasher.hashPassword(
      settings.tag,
      this.masterKey,
      settings.private_key,
      settings.password_length,
      settings.password_type
    );
    $(this.passwordInput).val(sitePassword);
  }
}

PasswordActivator.prototype.isEnabled = function() {
  return this.twikEnabled;
}

PasswordActivator.prototype.updateBackgroundColor = function() {
  if (this.twikEnabled) {
    this.passwordInput.get(0).style.setProperty('background', PROFILE_COLORS[settings.color], 'important');
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
    var enabledInProfile = $.inArray(activator.id, settings.enabled_inputs) != -1;
    if (enabledInProfile != activator.isEnabled()) {
      activator.toggleTwik();
    }

    if (activator.isEnabled()) {
      activator.updateBackgroundColor();
      activator.updatePassword();
    }
  }
}

function addNewNodeListener() {
  document.addEventListener('DOMNodeInserted', activateElement, false);
}

function removeNewNodeListener() {
  document.removeEventListener('DOMNodeInserted', activateElement, false);
}

function activateElement(event) {
  // We're going to add a new DOM element (qtip) so we should remove the listener first
  removeNewNodeListener();
  
  // Create the new activator in the case that it is a password input
  $('input[type=password]', event.srcElement).each(function() {
    activator = new PasswordActivator($(this));
    passwordActivators[passwordActivators.length] = activator;
    activator.init();
  });
  
  // Enable the new DOM element listener
  addNewNodeListener();
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
    
    // Listen for new password inputs added to the document
    addNewNodeListener();
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
