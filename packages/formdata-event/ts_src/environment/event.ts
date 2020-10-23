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

export const constructor = window.Event;

export const prototype = constructor.prototype;

export const methods = {
  initEvent: prototype.initEvent,
  stopImmediatePropagation: prototype?.stopImmediatePropagation,
  stopPropagation: prototype?.stopPropagation,
};

export const descriptors = {
  defaultPrevented: Object.getOwnPropertyDescriptor(prototype, 'defaultPrevented')!,
  target: Object.getOwnPropertyDescriptor(prototype, 'target')!,
  type: Object.getOwnPropertyDescriptor(prototype, 'type')!,
};
