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

let nativeAppendChild = Element.prototype.appendChild;
let nativeInsertBefore = Element.prototype.insertBefore;
let nativeRemoveChild = Element.prototype.removeChild;
let nativeSetAttribute = Element.prototype.setAttribute;
let nativeRemoveAttribute = Element.prototype.removeAttribute;

export function appendChild(parent, child) {
  return nativeAppendChild.call(parent, child);
}

export function insertBefore(parent, child, ref_node) {
  return nativeInsertBefore.call(parent, child, ref_node);
}
export function removeChild(parent, child) {
  return nativeRemoveChild.call(parent, child);
}

export function setAttribute(node, name, value) {
  nativeSetAttribute.call(node, name, value);
}

export function removeAttribute(node, name) {
  nativeRemoveAttribute.call(node, name);
}
