/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

export let appendChild = Element.prototype.appendChild;
export let insertBefore = Element.prototype.insertBefore;
export let removeChild = Element.prototype.removeChild;
export let setAttribute = Element.prototype.setAttribute;
export let removeAttribute = Element.prototype.removeAttribute;
export let cloneNode = Element.prototype.cloneNode;
export let importNode = Document.prototype.importNode;
export let addEventListener = Element.prototype.addEventListener;
export let removeEventListener = Element.prototype.removeEventListener;
export let windowAddEventListener = Window.prototype.addEventListener;
export let windowRemoveEventListener = Window.prototype.removeEventListener;
export let dispatchEvent = Element.prototype.dispatchEvent;
