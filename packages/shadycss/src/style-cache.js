/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
'use strict';

export default class StyleCache {
  constructor(typeMax = 100) {
    // map element name -> [{properties, styleElement, scopeSelector, partRules}]
    this.cache = {};
    /** @type {number} */
    this.typeMax = typeMax;
  }

  _validate(cacheEntry, properties, ownPropertyNames, partRules) {
    for (let idx = 0; idx < ownPropertyNames.length; idx++) {
      let pn = ownPropertyNames[idx];
      if (cacheEntry.properties[pn] !== properties[pn]) {
        return false;
      }
    }

    if (partRules) {
      if (
        !cacheEntry.partRules ||
        cacheEntry.partRules.length !== partRules.length
      ) {
        return false;
      }
      for (let idx = 0; idx < partRules.length; idx++) {
        if (cacheEntry.partRules[idx] !== partRules[idx]) {
          return false;
        }
      }
    } else if (cacheEntry.partRules) {
      return false;
    }

    return true;
  }

  store(tagname, properties, styleElement, scopeSelector, partRules) {
    const entry = {
      properties,
      styleElement,
      scopeSelector,
    };
    if (partRules !== undefined) {
      // Slice to make a copy so that in-place updates to this array invalidate
      // the cache.
      entry.partRules = partRules.slice();
    }
    let list = this.cache[tagname] || [];
    list.push(entry);
    if (list.length > this.typeMax) {
      list.shift();
    }
    this.cache[tagname] = list;
  }

  fetch(tagname, properties, ownPropertyNames, partRules) {
    let list = this.cache[tagname];
    if (!list) {
      return;
    }
    // reverse list for most-recent lookups
    for (let idx = list.length - 1; idx >= 0; idx--) {
      let entry = list[idx];
      if (this._validate(entry, properties, ownPropertyNames, partRules)) {
        return entry;
      }
    }
  }
}
