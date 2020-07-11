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

import {constructor as EventConstructor, prototype as EventPrototype} from '../environment/event.js';
import {wrapConstructor} from './wrap_constructor.js';

// This wrapper makes Event constructible / extensible in ES5 (the compilation
// target) by causing `Event.call(...)` to create native Event instances rather
// than throwing. It also avoids an issue with Safari where constructing a class
// that extends Event does not produce an instance of that class:
//
// ```js
// class SpecialEvent extends Event {}
// const s = new SpecialEvent("type");
// console.assert(s instanceof SpecialEvent); // fails in Safari 13.1
// ```
export const Event: typeof window.Event = function Event(this: Event, type: string, eventInit: EventInit = {}) {
  let _this;
  // When running in a browser where Event isn't constructible (e.g. IE11) this
  // throws and we fall back to the old `createEvent` API.
  try {
    _this = new EventConstructor(type, eventInit);
  } catch {
    _this = document.createEvent('Event');
    _this.initEvent(type, eventInit.bubbles, eventInit.cancelable);
  }
  Object.setPrototypeOf(_this, Object.getPrototypeOf(this));
  return _this;
} as Function as typeof window.Event;

export const install = () => {
  wrapConstructor(Event, EventConstructor, EventPrototype);

  // In IE11, `Object.getPrototypeOf(Event) === Object.prototype` and
  // `Object.getPrototypeOf(Event.prototype) === Object.prototype`.
  Object.setPrototypeOf(Event, Function);
  Object.setPrototypeOf(Event.prototype, Function.prototype);

  window.Event = Event;
};
