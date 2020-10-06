/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved. This
 * code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be
 * found at http://polymer.github.io/AUTHORS.txt The complete set of
 * contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt Code
 * distributed by Google as part of the polymer project is also subject to an
 * additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {descriptors as HTMLInputElementDescriptors} from '../environment/html_input_element.js';

// `type` is an own property with a data descriptor on each HTMLInputElement in
// Chrome 41.
const typeDescriptor = HTMLInputElementDescriptors.type ?? {};
// `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'type').set` is
// undefined in Safari 9.
const typeSetter = typeDescriptor.set ??
    function(this: HTMLInputElement, type: string) {
  this.type = type;
};
export const setType = (input: HTMLInputElement, type: string) => {
  return typeSetter.call(input, type);
};

// `name` is an own property with a data descriptor on each HTMLInputElement in
// Chrome 41.
const nameDescriptor = HTMLInputElementDescriptors.name ?? {};
// `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'name').set` is
// undefined in Safari 9.
const nameSetter = nameDescriptor.set ??
    function(this: HTMLInputElement, name: string) {
  this.name = name;
};
export const setName = (input: HTMLInputElement, name: string) => {
  return nameSetter.call(input, name);
};

// `value` is an own property with a data descriptor on each HTMLInputElement in
// Chrome 41.
const valueDescriptor = HTMLInputElementDescriptors.value ?? {};
// `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` is
// undefined in Safari 9.
const valueSetter = valueDescriptor.set ??
    function(this: HTMLInputElement, value: string) {
  this.value = value;
};
export const setValue = (input: HTMLInputElement, value: string) => {
  return valueSetter.call(input, value);
};
