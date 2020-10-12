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

const Element_prototype = Element.prototype;
const attributesDescriptor =
    Object.getOwnPropertyDescriptor(Element_prototype, 'attributes') ??
    // In IE11, the `attributes` descriptor is on `Node.prototype`.
    Object.getOwnPropertyDescriptor(Node.prototype, 'attributes');
const getAttributes = attributesDescriptor!.get!;
const map = Array.prototype.map;

if (!Element_prototype.hasOwnProperty('getAttributeNames')) {
  Element_prototype.getAttributeNames = function getAttributeNames(this: Element): Array<string> {
    return map.call(getAttributes.call(this), attr => attr.name) as Array<string>;
  };
}
