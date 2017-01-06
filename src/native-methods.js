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
export let appendChild = nativeAppendChild;

let nativeInsertBefore = Element.prototype.insertBefore;
export let insertBefore = nativeInsertBefore;

let nativeRemoveChild = Element.prototype.removeChild;
export let removeChild = nativeRemoveChild;

let nativeSetAttribute = Element.prototype.setAttribute;
export let setAttribute = nativeSetAttribute;

let nativeRemoveAttribute = Element.prototype.removeAttribute;
export let removeAttribute = nativeRemoveAttribute;

let nativeCloneNode = Element.prototype.cloneNode;
export let cloneNode = nativeCloneNode;

let nativeImportNode = Document.prototype.importNode;
export let importNode = nativeImportNode;

let nativeAddEventListener = Element.prototype.addEventListener;
export let addEventListener = nativeAddEventListener;

let nativeRemoveEventListener = Element.prototype.removeEventListener;
export let removeEventListener = nativeRemoveEventListener;
