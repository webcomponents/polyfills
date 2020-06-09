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

import {constructor as EventConstructor, prototype as EventPrototype} from "../Environment/Event.js";

export const install = () => {
  const EventWrapper = function Event(this: Event, type: string, eventInit: EventInit = {}) {
    let e;
    try {
      e = new EventConstructor(type, eventInit);
    } catch {
      e = document.createEvent('Event');
      e.initEvent(type, eventInit.bubbles, eventInit.cancelable);
    }
    Object.setPrototypeOf(e, Object.getPrototypeOf(this));
    return e;
  };
  for (const prop of Object.keys(EventConstructor)) {
    Object.defineProperty(EventWrapper, prop,
        Object.getOwnPropertyDescriptor(EventConstructor, prop) as PropertyDescriptor);
  }
  Object.setPrototypeOf(EventWrapper, Function);
  EventWrapper.prototype = EventPrototype;
  EventWrapper.prototype.constructor = EventWrapper;

  (window.Event as any) = EventWrapper;
};
