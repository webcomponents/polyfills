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
import {addEventListener, removeEventListener} from './environment_api/event_target.js';
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
  const submitListeners = targetToSubmitListeners.get(target)!;
  const initialSubmitListenerCount = submitListeners.length;

  submitListeners.push({callback, capture});

  // Was the new listener added? (i.e. Was it not deduplicated?)
  if (submitListeners.length > initialSubmitListenerCount) {
    // Remove and re-add `finalSubmitCallback` to move it to the end of the list
    // of listeners for the given phase.
    removeEventListener.call(target, 'submit', finalSubmitCallback, capture);
    addEventListener.call(target, 'submit', finalSubmitCallback, capture);
  }
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

  // If there are no remaining capturing 'submit' listeners, remove the
  // capturing `finalSubmitListener`.
  if (capture && submitListeners.capturingCount === 0) {
    removeEventListener.call(target, 'submit', finalSubmitCallback, capture);
  }

  // If there are no remaining bubbling 'submit' listeners, remove the bubbling
  // `finalSubmitListener`.
  if (!capture && submitListeners.bubblingCount === 0) {
    removeEventListener.call(target, 'submit', finalSubmitCallback, capture);
  }
};

const eventToPropagationStopped = new WeakMap<Event, true>();

/**
 * This callback listens for 'submit' events on EventTargets with other 'submit'
 * event listeners. The callback listens at both the capturing and bubbling
 * phases, if any other listener at that phase is added, and is moved by
 * `submitListenerAdded` to always be the *last* 'submit' listener for that
 * phase.
 */
const finalSubmitCallback = (event: Event) => {
  // If the event's propagation was stopped by `stopPropagation` but not
  // cancelled, dispatch the 'formdata' event.
  if (eventToPropagationStopped.has(event) && !getDefaultPrevented(event)) {
    dispatchFormdataForSubmission(getTarget(event));
  }
};

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

  // Ignore any cancelled events.
  if (!getDefaultPrevented(event)) {
    dispatchFormdataForSubmission(getTarget(event));
  }
});
