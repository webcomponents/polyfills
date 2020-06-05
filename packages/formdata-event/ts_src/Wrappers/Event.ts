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

export const install = () => {
  // Thanks, IE
  try {
    new Event('name');
  } catch {
    const EventWrapper = function Event(type: string, eventInit: EventInit = {}) {
      const e = document.createEvent('Event');
      e.initEvent(type, eventInit.bubbles, eventInit.cancelable);
      return e;
    };
    Object.setPrototypeOf(Event, Function);
    Object.setPrototypeOf(EventWrapper, Event);
    EventWrapper.prototype = Event.prototype;
    EventWrapper.prototype.constructor = EventWrapper;

    (window.Event as any) = EventWrapper;
  }
};
