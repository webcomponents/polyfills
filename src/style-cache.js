/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
'use strict';

export default class StyleCache {
  constructor(max = 100) {
    // map element name -> [{properties, bitmask, stylesheet}]
    this.cache = {};
    this.max = max;
  }

  _validate(cacheEntry, bitmask, properties) {
    if (this._bitmaskEqual(cacheEntry.bitmask, bitmask)) {
      return this._deepEqual(cacheEntry.properties, properties);
    }
  }

  _bitmaskEqual(bitA, bitB) {
    if (bitA.length === bitB.length) {
      for (let i = 0; i < bitA.length; i++) {
        if (bitA[i] !== bitB[i]) {
          return false;
        }
      }
    }
    return true;
  }

  _deepEqual(objA, objB) {
    if (!objA || !objB) {
      return;
    }
    let keysA = Object.getOwnPropertyNames(objA);
    let keysB = Object.getOwnPropertyNames(objB);
    if (keysA.length === keysB.length) {
      for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) {
          return false;
        }
        if (objA[keysA[i]] !== objB[keysB[i]]) {
          return false;
        }
      }
    }
    let protoA = Object.getPrototypeOf(objA);
    let protoB = Object.getPrototypeOf(objB);
    if (protoA === protoB) {
      return true;
    } else {
      return this._deepEqual(protoA, protoB);
    }
  }

  store(tagname, properties, bitmask, stylesheet, scopeSelector) {
    let list = this.cache[tagname] || [];
    list.push({properties, bitmask, stylesheet, scopeSelector});
    if (list.length > this.max) {
      list.shift();
    }
    this.cache[tagname] = list;
  }
  fetch(tagname, properties, bitmask) {
    let list = this.cache[tagname];
    if (!list) {
      return;
    }
    // reverse list for most-recent lookups
    for (let idx = list.length - 1; idx >= 0; idx--) {
      let entry = list[idx];
      if (this._validate(entry, bitmask, properties)) {
        return entry;
      }
    }
  }
  clear() {
    this.cache = {};
  }
}
