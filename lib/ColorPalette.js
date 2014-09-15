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

function ColorPalette(id, colors, value, onColorClickCallback) {
  this.value = value;
  this.onColorClickCallback = onColorClickCallback;
  this.id = id;
  this.buttons = [];
  var ref = this;
  
  for (i = 0; i < colors.length; i++) {
    var button = $('<button/>');
    button.css('background-color', colors[i]);
    button.val(i);
    if (i == value) {
      button.addClass('selected');
    }
    button.click(function() {
      ref.colorClicked($(this).val());
    });
    this.buttons[this.buttons.length] = button;
  }
}

ColorPalette.prototype.init = function() {
  for (var i = 0; i < this.buttons.length; i++) {
    $('#' + this.id).append(this.buttons[i]);
  }
}

ColorPalette.prototype.colorClicked = function(value) {
  this.selectColor(value);
  this.onColorClickCallback(value);
}

ColorPalette.prototype.selectColor = function(value) {
  this.value = value;
  $('#' + this.id).find('button').removeClass('selected');
  $('#' + this.id + ' button:eq(' + value + ')').addClass('selected');
}
