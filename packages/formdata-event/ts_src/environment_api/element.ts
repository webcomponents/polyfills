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

import {methods as ElementMethods} from '../environment/element.js';

export const hasAttribute = (element: Element, name: string): boolean => {
  return ElementMethods.hasAttribute.call(element, name);
};

export const getAttribute = (element: Element, name: string): string | null => {
  return ElementMethods.getAttribute.call(element, name);
};

export const removeAttribute = (element: Element, name: string): void => {
  ElementMethods.removeAttribute.call(element, name);
};

export const setAttribute = (element: Element, name: string, value: string): void => {
  ElementMethods.setAttribute.call(element, name, value);
};
