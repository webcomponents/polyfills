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
    // map element name -> [{properties, styleElement, scopeSelector, partRulesApplied}]
    this.cache = {};
    /** @type {number} */
    this.typeMax = typeMax;
  }

  _validate(cacheEntry, properties, ownPropertyNames, partRulesApplied) {
    for (let idx = 0; idx < ownPropertyNames.length; idx++) {
      let pn = ownPropertyNames[idx];
      if (cacheEntry.properties[pn] !== properties[pn]) {
        return false;
      }
    }
    if (partRulesApplied.length !== cacheEntry.partRulesApplied.length) {
      return false;
    }
    for (let idx = 0; idx < partRulesApplied.length; idx++) {
      if (cacheEntry.partRulesApplied[idx] !== partRulesApplied[idx]) {
        return false;
      }
    }
    return true;
  }

  store(tagname, properties, styleElement, scopeSelector, partRulesApplied) {
    console.log('store', {
      tagname,
      properties: properties,
      styleElement,
      scopeSelector,
      partRulesApplied: partRulesApplied.slice(),
    });
    let list = this.cache[tagname] || [];
    list.push({properties, styleElement, scopeSelector, partRulesApplied: partRulesApplied.slice()});
    if (list.length > this.typeMax) {
      list.shift();
    }
    this.cache[tagname] = list;
  }

  fetch(tagname, properties, ownPropertyNames, partRulesApplied) {
    console.log('fetch', {
      tagname,
      properties: properties,
      ownPropertyNames: ownPropertyNames.slice(),
      partRulesApplied: partRulesApplied.slice(),
    });
    let list = this.cache[tagname];
    if (!list) {
      return;
    }
    // reverse list for most-recent lookups
    for (let idx = list.length - 1; idx >= 0; idx--) {
      let entry = list[idx];
      if (this._validate(entry, properties, ownPropertyNames, partRulesApplied)) {
        return entry;
      }
    }
  }
}
