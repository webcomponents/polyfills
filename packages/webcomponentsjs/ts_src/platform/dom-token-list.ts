/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/

export {};

const DOMTokenList_prototype = window.DOMTokenList.prototype;
const nativeAdd = DOMTokenList_prototype.add;
const nativeContains = DOMTokenList_prototype.contains;
const nativeRemove = DOMTokenList_prototype.remove;

const testDiv = document.createElement('div');

// Multi-argument `add`
testDiv.setAttribute('class', '');
testDiv.classList.add('a', 'b');
if (testDiv.getAttribute('class') !== 'a b') {
  DOMTokenList_prototype.add = function add(...args) {
    for (const arg of args) {
      nativeAdd.call(this, arg);
    }
  };
}

// Multi-argument `remove`
testDiv.setAttribute('class', 'a b');
testDiv.classList.remove('a', 'b');
if (testDiv.getAttribute('class') !== '') {
  DOMTokenList_prototype.remove = function remove(...args) {
    for (const arg of args) {
      nativeRemove.call(this, arg);
    }
  };
}

if (!DOMTokenList_prototype.hasOwnProperty('replace')) {
  DOMTokenList_prototype.replace = function replace(oldToken, newToken) {
    if (!nativeContains.call(this, oldToken)) {
      return false;
    }

    nativeRemove.call(this, oldToken);
    nativeAdd.call(this, newToken);
    return true;
  };
}

// `toggle` with `force` argument
testDiv.setAttribute('class', 'a');
testDiv.classList.toggle('a', true);
if (testDiv.getAttribute('class') === '') {
  DOMTokenList_prototype.toggle = function replace(token, force) {
    if (nativeContains.call(this, token)) {
      if (force === undefined || !force) {
        nativeRemove.call(this, token);
        return false;
      }

      return true;
    } else {
      if (force === undefined || force) {
        nativeAdd.call(this, token);
        return true;
      }

      return false;
    }
  };
}
