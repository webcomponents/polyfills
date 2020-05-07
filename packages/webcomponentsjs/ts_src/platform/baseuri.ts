/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/

export {};

// Implement Node.baseURI for IE 11
// adapted from
// https://github.com/webcomponents/html-imports/blob/v1.2.0/src/html-imports.js

const native_baseURI =
    Object.getOwnPropertyDescriptor(Node.prototype, 'baseURI');
if (!native_baseURI) {
  Object.defineProperty(Node.prototype, 'baseURI', {
    get(this: Node): string {
      // this.ownerDocument is `null` for documents
      const doc = this.ownerDocument || this as Document;
      const base = doc.querySelector('base[href]') as HTMLBaseElement;
      return base && base.href || window.location.href;
    },
    configurable: true,
    enumerable: true
  });
}
