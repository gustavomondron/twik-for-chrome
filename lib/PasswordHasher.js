/*
 * Copyright (C) 2014 Red Dye No. 2
 * Copyright (C) 2010-2014 Eric Woodruff
 * Copyright (C) 2006-2010 Steve Cooper
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
function PasswordHasher() { }

PasswordHasher.prototype._hashPassword = function(tag, key, length, type) {
  var hash = b64_hmac_sha1(key, tag);
  var sum = 0;
  for (i = 0; i < hash.length; i++) {
    sum += hash.charCodeAt(i);
  }
  
  /* Parse password to match the request type */
  if (type == PASSWORD_TYPES.NUMERIC) {
    hash = this.convertToDigits(hash, sum, length);
  } else {
    /* We force digits, punctuation characters and mixed case */
    // Force digits
    hash = this.injectCharacter(hash, 0, 4, sum, length, '0', 10);
    if (type == PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS) {
      // Force special chars
      hash = this.injectCharacter(hash, 1, 4, sum, length, '!', 15);
    }
    
    // Force mixed case
    hash = this.injectCharacter(hash, 2, 4, sum, length, 'A', 26);
    hash = this.injectCharacter(hash, 3, 4, sum, length, 'a', 26);

    // Remove special chars if needed
    if (type == PASSWORD_TYPES.ALPHANUMERIC) {
      hash = this.removeSpecialCharacters(hash, sum, length);
    }
  }
  
  /* Trim the password to match the requested length */
  return hash.substring(0, length);
}

PasswordHasher.prototype.hashPassword = function(tag, masterKey, privateKey, length, passwordType) {
  if (privateKey != null) {
    tag = this._hashPassword(privateKey, tag, 24, PASSWORD_TYPES.ALPHANUMERIC_AND_SPECIAL_CHARS);
  }
  
  return this._hashPassword(tag, masterKey, length, passwordType);
}

PasswordHasher.prototype.convertToDigits = function(input, seed, length) {
  var pivot = 0;
  var zeroChar = '0'.charCodeAt(0);
  for (i = 0; i < length; i++) {
    if (!this.isDigit(input[i])) {
      input[i] = String.fromCharCode((seed + input.charCodeAt(pivot)) % 10 + zeroChar);
      pivot = i + 1;
    }
  }
  
  return input;
}

PasswordHasher.prototype.removeSpecialCharacters = function(input, seed, length) {
  var pivot = 0;
  var aChar = 'A'.charCodeAt(0);
  for(i = 0; i < length; i++) {
    if (!this.isAlphaOrDigit(input[i])) {
      input[i] = String.fromCharCode((seed + pivot) % 26 + aChar);
      pivot = i + 1;
    }
  }
  
  return input;
}

PasswordHasher.prototype.injectCharacter = function(input, offset, reserved, seed, length, cStart, cNum) {
  var pos0 = seed % length;
  var pos = (pos0 + offset) % length;
  var cStartCode = cStart.charCodeAt(0);
  for (i = 0; i < length - reserved; i++) {
    var i2 = (pos0 + reserved + i) % length;
    var c = input.charCodeAt(i2);
    if (c >= cStartCode && c < (cStartCode + cNum)) {
      return input;
    }
  }
  
  head = pos > 0 ? input.substring(0, pos) : '';
  inject = String.fromCharCode(((seed + input.charCodeAt(pos)) % cNum) + cStartCode);
  tail = (pos + 1 < input.length) ? input.substring(pos + 1) : '';
  return head + inject + tail;
}

PasswordHasher.prototype.isDigit = function(char) {
  return char >= '0' && char <= '9';
}

PasswordHasher.prototype.isAlphaOrDigit = function(char) {
  return isDigit(char) || (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}
