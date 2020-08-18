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

import {methods as DocumentMethods} from '../environment/document.js';
import {constructor as EventConstructor, prototype as EventPrototype, methods as EventMethods} from '../environment/event.js';
import {document} from '../environment/globals.js';
import {getType, initEvent} from '../environment_api/event.js';
import {prepareWrapper, installWrapper} from './wrap_constructor.js';

/**
 * A callback that is called whenever an Event's propagation is stopped.
 *
 * Q: Why doesn't this file just import and call the callback from
 * 'formdata_listener_added.ts' directly, given that this value is set to that
 * function and never changed?
 *
 * A: The way Closure compiles classes down to ES5 (which involves modifying the
 * constructor function's prototype) paired with the prototype modifications
 * necessary to wrap a built-in constructor, the `prepareWrapper` call in the
 * `Event` wrapper must come *before* the `prepareWrapper` call for
 * `FormDataEvent`. As of writing this, importing the function directly causes a
 * dependency cycle which reorders these two calls and breaks the
 * `FormDataEvent` prototype.
 */
let submitEventPropagationStoppedCallback: ((e: Event) => void) | undefined = undefined;

/**
 * Sets the callback to be called whenever an Event's propagation is stopped.
 */
export const setSubmitEventPropagationStoppedCallback = (fn: (e: Event) => void) => {
  submitEventPropagationStoppedCallback = fn;
};

/**
 * A callback that is called whenever an Event's propagation is immediately
 * stopped.
 *
 * See the note above for `submitEventPropagationStoppedCallback`.
 */
let submitEventPropagationImmediatelyStoppedCallback: ((e: Event) => void) | undefined = undefined;

/**
 * Sets the callback to be called whenever an Event's propagation is immediately
 * stopped.
 */
export const setSubmitEventPropagationImmediatelyStoppedCallback = (fn: (e: Event) => void) => {
  submitEventPropagationImmediatelyStoppedCallback = fn;
};

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
    _this = DocumentMethods.createEvent.call(document, 'Event');
    initEvent(_this, type, eventInit.bubbles, eventInit.cancelable);
  }
  Object.setPrototypeOf(_this, Object.getPrototypeOf(this));
  return _this;
} as Function as typeof window.Event;

prepareWrapper(Event, EventConstructor, EventPrototype);

export const install = () => {
  installWrapper(Event);

  // In IE11, `Object.getPrototypeOf(window.Event) === Object.prototype`, which
  // was copied by `prepareWrapper` from `window.Event` to `Event` above.
  Object.setPrototypeOf(Event, Function.prototype);

  Event.prototype['stopImmediatePropagation'] = function() {
    if (getType(this) === 'submit') {
      submitEventPropagationImmediatelyStoppedCallback?.(this);
    }
    return EventMethods.stopImmediatePropagation.call(this);
  };

  Event.prototype['stopPropagation'] = function() {
    if (getType(this) === 'submit') {
      submitEventPropagationStoppedCallback?.(this);
    }
    return EventMethods.stopPropagation.call(this);
  };

  window.Event = Event;
};
