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

import {
  descriptors as EventDescriptors,
  methods as EventMethods,
} from '../environment/event.js';

// `Object.getOwnPropertyDescriptor(Event.prototype, 'target')` is undefined
// in Chrome 41.
// `Object.getOwnPropertyDescriptor(Event.prototype, 'target').get` is undefined
// in Safari 9.
const targetGetter = EventDescriptors.target?.get;
export const getTarget =
  targetGetter !== undefined
    ? (e: Event) => {
        return targetGetter.call(e);
      }
    : (e: Event) => {
        return e.target;
      };

export const getType = (e: Event) => EventDescriptors.type.get!.call(e);

// `Object.getOwnPropertyDescriptor(Event.prototype, 'defaultPrevented')` is undefined
// in Chrome 41.
// `Object.getOwnPropertyDescriptor(Event.prototype, 'defaultPrevented').get` is undefined
// in Safari 9.
const defaultPreventedGetter = EventDescriptors.defaultPrevented?.get;
export const getDefaultPrevented =
  defaultPreventedGetter !== undefined
    ? (e: Event) => {
        return defaultPreventedGetter.call(e);
      }
    : (e: Event) => {
        return e.defaultPrevented;
      };

export const initEvent = (
  event: Event,
  type: string,
  bubbles = false,
  cancelable = false
) => {
  EventMethods.initEvent.call(event, type, bubbles, cancelable);
};
