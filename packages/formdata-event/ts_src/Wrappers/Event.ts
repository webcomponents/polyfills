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
  // Thanks, IE
  try {
    new Event('name');
  } catch {
    const EventWrapper = function Event(this: Event, type: string, eventInit: EventInit = {}) {
      const e = document.createEvent('Event');
      Object.setPrototypeOf(e, Object.getPrototypeOf(this));
      e.initEvent(type, eventInit.bubbles, eventInit.cancelable);
      return e;
    };
    Object.setPrototypeOf(EventConstructor, Function);
    Object.setPrototypeOf(EventWrapper, EventConstructor);
    EventWrapper.prototype = EventPrototype;
    EventWrapper.prototype.constructor = EventWrapper;

    (window.Event as any) = EventWrapper;
  }
};
