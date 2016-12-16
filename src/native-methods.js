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

let appendChild = Element.prototype.appendChild;
let insertBefore = Element.prototype.insertBefore;
let removeChild = Element.prototype.removeChild;
let setAttribute = Element.prototype.setAttribute;
let removeAttribute = Element.prototype.removeAttribute;

export let nativeMethods = {
  appendChild(parent, child) {
    return appendChild.call(parent, child);
  },
  insertBefore(parent, child, ref_node) {
    return insertBefore.call(parent, child, ref_node);
  },
  removeChild(parent, child) {
    return removeChild.call(parent, child);
  },
  setAttribute(node, name, value) {
    setAttribute.call(node, name, value);
  },
  removeAttribute(node, name) {
    removeAttribute.call(node, name);
  }
};