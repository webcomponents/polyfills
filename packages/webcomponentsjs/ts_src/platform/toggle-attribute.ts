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

const Element_prototype = Element.prototype;

if (!Element_prototype.hasOwnProperty('toggleAttribute')) {
  Element_prototype.toggleAttribute = function toggleAttribute(
    this: Element,
    name: string,
    force?: boolean
  ): boolean {
    if (force === undefined) {
      if (this.hasAttribute(name)) {
        this.removeAttribute(name);
        return false;
      } else {
        this.setAttribute(name, '');
        return true;
      }
    }
    if (force) {
      if (!this.hasAttribute(name)) {
        this.setAttribute(name, '');
      }
      return true;
    }
    // force is falsey
    this.removeAttribute(name);
    return false;
  };
}
