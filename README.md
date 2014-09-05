Twik for Google Chrome
======================

Twik is an easy to use password generator and manager for Google Chrome.
Your passwords are always available when you need them, but they are never stored anywhere!

Keeping up with todays password requirements isn’t easy. On the one hand, you want to have different, hard-to-guess passwords for each website and service. On the other hand, it’s hard to remember so many passwords! You can rely on a web service to keep all your passwords, and make them readily available from any device. However, this creates a single point of failure: if this password service is compromised, all your passwords would be leaked!

Twik works in a different way. You have to provide a private key that will be stored in the computer, and think of a strong master key that will not be stored anywhere. Any time you need to generate a password for a website, you must type your master key. The combination of the master key, the private key, and the website will be used to generate a unique, strong password. Since passwords are generated each time, even if one of them is compromised the rest would be safe. Twik integrates with the web browser: you type your master key in the website form and Twik will replace it with the website password automatically.

Twik is compatible with Password Hasher Plus, a Chrome extension by Eric Woodruff that follows the same principles for generating strong passwords. You can use the same private and master keys to generate the same passwords on your desktop browser.

Twik is also available as an Android application.

Twik features include:
- Several profiles, each with its own private key and settings.
- Customize password generation for each website (password length and characters)
- Automatically replaces your master key with the website password in your websites.

License
-------

Twik is free software and is distributed under the GPLv3 license. See
COPYING for more information.

External code
-------------

This project uses code from third-parties, licensed under their own terms:
- [Password Hasher](https://addons.mozilla.org/en-US/firefox/addon/password-hasher/)
by Steve Cooper. Distributed under MPL 1.1/GPL 2.0/LGPL 2.1 licenses.
- [Password Hasher Plus](http://passwordhasherplus.com) by Eric Woodruff.
Distributed under MPL 1.1/GPL 2.0/LGPL 2.1 licenses.
- [jQuery](http://jquery.com/) by jQuery Foundation.
- [qTip 2](http://qtip2.com/) by Craig Thompson.
- [TLD](https://www.npmjs.org/package/tldjs) by Thomas Parisot. Distributed under the MIT license.
- [SHA1 Javascript Implementation](http://pajhome.org.uk/crypt/md5/) by Paul Johnston. Distributed under the BSD License.
- [Javascript i18n localization script](https://code.google.com/p/adblockforchrome/source/browse/trunk/functions.js) by the AdBlock Team. Distributed under the GNU GPL 3.0 License.
