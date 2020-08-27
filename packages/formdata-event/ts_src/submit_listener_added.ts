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

import {getTarget, getDefaultPrevented} from './environment_api/event.js';
import {setSubmitEventPropagationStoppedCallback, setSubmitEventPropagationImmediatelyStoppedCallback} from './wrappers/event.js';
import {dispatchFormdataForSubmission} from './dispatch_formdata_for_submission.js';
import {EventListenerArray} from './event_listener_array.js';
import {removeBubblingCallback} from './formdata_listener_added.js';

/**
 * The set of 'submit' event listeners for an event target.
 */
const targetToSubmitListeners = new WeakMap<EventTarget, EventListenerArray>();

/**
 * This function should be called when any 'submit' event listener is added to
 * `target`.
 */
export const submitListenerAdded = (
  target: EventTarget,
  callback: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions,
) => {
  // If this listener's `callback` is null, the browser ignores it.
  if (!callback) {
    return;
  }

  if (!targetToSubmitListeners.has(target)) {
    targetToSubmitListeners.set(target, new EventListenerArray());
  }

  const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);
  targetToSubmitListeners.get(target)!.push({callback, capture});
};

/**
 * This function should be called when any 'submit' event listener is removed
 * from `target`.
 */
export const submitListenerRemoved = (
  target: EventTarget,
  callback: EventListenerOrEventListenerObject | null,
  options?: boolean | EventListenerOptions,
) => {
  // Event listeners with null callbacks aren't stored.
  if (!callback) {
    return;
  }

  const submitListeners = targetToSubmitListeners.get(target);
  if (submitListeners === undefined) {
    return;
  }

  const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);
  submitListeners.delete({callback, capture});
};

const eventToPropagationStopped = new WeakMap<Event, true>();
const eventToPropagationImmediatelyStopped = new WeakMap<Event, true>();

/**
 * This function will be called when any 'submit' event's propagation is stopped
 * by `stopPropagation`.
 */
setSubmitEventPropagationStoppedCallback((event: Event) => {
  removeBubblingCallback(event);
  eventToPropagationStopped.set(event, true);
});

/**
 * This function will be called when any 'submit' event's propagation is stopped
 * by `stopImmediatePropagation`.
 */
setSubmitEventPropagationImmediatelyStoppedCallback((event: Event) => {
  removeBubblingCallback(event);
  eventToPropagationImmediatelyStopped.set(event, true);
});

export const wrapSubmitListener = (listener: EventListenerOrEventListenerObject): EventListener => {
  return function wrapper(this: EventTarget, e: Event, ...rest) {
    const result: any = typeof listener === "function" ?
        listener.call(this, e, ...rest) :
        listener.handleEvent(e, ...rest);

    // Ignore any cancelled events.
    if (!getDefaultPrevented(e)) {
      if (eventToPropagationImmediatelyStopped.has(e)) {
        dispatchFormdataForSubmission(getTarget(e));
      } else if (eventToPropagationStopped.has(e)) {
        const submitListeners = targetToSubmitListeners.get(getTarget(e))!;
        const {lastCapturingCallback, lastBubblingCallback} = submitListeners;

        if (wrapper === lastCapturingCallback || wrapper === lastBubblingCallback) {
          dispatchFormdataForSubmission(getTarget(e));
        }
      }
    }

    return result;
  };
};
