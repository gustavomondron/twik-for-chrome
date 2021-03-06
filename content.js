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
  this.twikShowButton = null;
  enabled_inputs = settings['enabled_inputs'];
  this.twikEnabled = enabled_inputs.indexOf(this.id) >= 0;
  this.passwordShown = false;
  this.masterKey = '';
  this.inputBackground = $(passwordInput).css('background');
  this.tipText = '<div class="twik-tip"><button class="twik-show-pass-button" title="Ctrl-Shift-S"/><button class="twik-button" title="Ctrl-Shift-K"/></div>';
  this.ctrlKeyPressed = false;
  this.shiftKeyPressed = false;
  this.restoreMasterKey = false;
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
          activator.toggleTwik(true, true);
        });
        if (!activator.twikEnabled) {
          $(activator.twikEnableButton).addClass("twik-button-disabled");
        }
        activator.twikShowButton = $(".twik-show-pass-button", api.elements.content).get(0);
        activator.twikShowButton.addEventListener("click", function() {
          activator.toggleShowPassword(true);
        });
      }
    }
  });
  
  $(this.passwordInput).focus(function() {
    this.setAttribute('type', 'password');
    $(this).val(activator.masterKey);
  });

  this.passwordInput[0].onblur = function() {
    if (activator.twikEnabled) {
      activator.updatePassword();
      if (activator.passwordShown) {
        this.setAttribute('type', 'text');
      }
    }
  };

  this.passwordInput[0].onkeyup = function(event) {
    event.stopImmediatePropagation();
    switch (event.which) {
      case KEY_CTRL:
        activator.ctrlKeyPressed = false;
        break;
      case KEY_SHIFT:
        activator.shiftKeyPressed = false;
        break;
    }

    var ctrlShiftPressed = activator.ctrlKeyPressed && activator.shiftKeyPressed;
    if (ctrlShiftPressed) {
      switch (event.which) {
        case KEY_K:
          activator.toggleTwik(true, false);
          break;
        case KEY_S:
          activator.toggleShowPassword(false);
          break;
      }
    } else if (!activator.restoreMasterKey) {
      activator.masterKey = this.value;
    }

    return true;
  };

  $(this.passwordInput).keydown(function(event) {
    event.stopImmediatePropagation();
    switch (event.which) {
      case KEY_CTRL:
        activator.ctrlKeyPressed = true;
        break;
      case KEY_SHIFT:
        activator.shiftKeyPressed = true;
        break;
      case KEY_ENTER:
        if (activator.twikEnabled) {
          // Submitting form
          activator.updatePassword();
        }
        break;
      case KEY_C:
        if (activator.twikEnabled && activator.passwordShown && activator.ctrlKeyPressed) {
          activator.restoreMasterKey = true;
          activator.updatePassword();
          this.setAttribute('type', 'text');
          $(this).select();
        }
      default:
        if (!activator.ctrlKeyPressed && !activator.shiftKeyPressed && activator.restoreMasterKey) {
          this.setAttribute('type', 'password');
          $(this).val(activator.masterKey);
          activator.restoreMasterKey = false;
        }
    }
    return true;
  });

  this.passwordInput[0].onclick = function() {
    if (activator.restoreMasterKey) {
      this.setAttribute('type', 'password');
      $(this).val(activator.masterKey);
      activator.restoreMasterKey = false;
    }
  };
  
  if (this.twikEnabled) {
    this.twikEnabled = false; // Not really enabled at the beginning :-)
    this.toggleTwik(false, true);
  }
}

PasswordActivator.prototype.toggleShowPassword = function(updateInput) {
  this.passwordShown = !this.passwordShown;
  if (this.passwordShown) {
    $(this.twikShowButton).addClass('twik-hide-pass-button');
    $(this.twikShowButton).removeClass('twik-show-pass-button');
    if (this.twikEnabled && updateInput) {
      this.passwordInput.get(0).setAttribute('type', 'text');
    }
  } else {
    $(this.twikShowButton).addClass('twik-show-pass-button');
    $(this.twikShowButton).removeClass('twik-hide-pass-button');
    if (updateInput) {
      this.passwordInput.get(0).setAttribute('type', 'password');
    }
  }
}

PasswordActivator.prototype.toggleTwik = function(sendMessage, updatePassword) {
  this.twikEnabled = !this.twikEnabled;
  if (this.twikEnabled) {
    // Set profile color as input background color and add Twik CSS class
    this.passwordInput.get(0).style.setProperty('background', PROFILE_COLORS[settings.color], 'important');
    $(this.passwordInput).addClass('twik-enabled');

    // Update website pasword
    if (updatePassword) {
      this.currentPassword = this.updatePassword();
      // If "show password" is activated, show the generated password
      if (this.passwordShown) {
        this.passwordInput.get(0).setAttribute('type', 'text');
      }
    }

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

    // Update Twik button
    if (this.twikEnableButton != null) {
      $(this.twikEnableButton).removeClass("twik-button-disabled");
    }
  } else {
    // Restore background color and remove Twik CSS class
    this.passwordInput.get(0).style.setProperty('background', this.inputBackground, 'important');
    $(this.passwordInput).removeClass('twik-enabled');

    // Make sure that password is not shown
    if (this.passwordShown) {
      this.toggleShowPassword(true);
    }
    
    // Restore master key
    $(this.passwordInput).val(this.masterKey);

    // Update website settings
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

    // Update Twik button
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
      activator.toggleTwik(false, true);
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
    // Check whether we already have a PasswordActivator for this input
    found = false;
    for (i = 0; i < passwordActivators.length; i++) {
      id = passwordActivators[i].passwordInput[0].id;
      found = id.length > 0 && id == this.id;
    }
    if (!found) {
      activator = new PasswordActivator($(this));
      passwordActivators[passwordActivators.length] = activator;
      activator.init();
    }
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
