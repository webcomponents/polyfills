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
import {getRootNode} from './environment_api/node.js';
import {dispatchFormdataForSubmission} from './dispatch_formdata_for_submission.js';

interface FormdataEventListenerRecord {
  callback: EventListenerOrEventListenerObject;
  capture: boolean;
}

/**
 * The set of event listeners for 'formdata' events for any event target,
 * including enough information to determine if they would be deduplicated: type
 * (always 'formdata' here), the callback itself, and capture flag. See
 * https://dom.spec.whatwg.org/#add-an-event-listener for a full description.
 */
const targetToFormdataListeners = new WeakMap<EventTarget, Set<FormdataEventListenerRecord>>();

/**
 * This function should be called when any 'formdata' event listener is added to
 * `target`. If this is the first 'formdata' event listener added to `target`,
 * then it will also add the 'submit' listener.
 */
export const formdataListenerAdded = (
  target: EventTarget,
  callback: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions,
) => {
  // If this listener's `callback` is null, the browser ignores it.
  if (!callback) {
    return;
  }

  const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);
  const formdataListeners = targetToFormdataListeners.get(target);

  // When the first 'formdata' listener is added, also add the 'submit'
  // listener.
  if (formdataListeners === undefined) {
    targetToFormdataListeners.set(target, new Set([{callback, capture}]));
    addSubmitListener(target);
    return;
  }

  // If this listener has the same callback and capture flag as any that
  // already exists, the browser ignores it.
  for (const existing of formdataListeners) {
    if (callback === existing.callback && capture === existing.capture) {
      return;
    }
  }

  formdataListeners.add({callback, capture});
};

/**
 * This function should be called when any 'formdata' event listener is removed
 * from `target`. If this is the last 'formdata' event listener on `target`,
 * then it will also remove the 'submit' listener.
 */
export const formdataListenerRemoved = (
  target: EventTarget,
  callback: EventListenerOrEventListenerObject | null,
  options?: boolean | EventListenerOptions,
) => {
  const formdataListeners = targetToFormdataListeners.get(target);
  if (formdataListeners === undefined) {
    return;
  }

  const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);

  // Remove any existing listener that matches the given arguments.
  for (const existing of formdataListeners) {
    if (callback === existing.callback && capture === existing.capture) {
      formdataListeners.delete(existing);
      break;
    }
  }

  // When the last 'formdata' event listener is removed, also remove the
  // 'submit' listener.
  if (formdataListeners.size === 0) {
    targetToFormdataListeners.delete(target);
    removeSubmitListener(target);
  }
};

/**
 * Tracks the 'submit' event listener applied to each EventTarget that has at
 * least one 'formdata' event listener.
 */
const targetToSubmitCallback = new WeakMap<EventTarget, EventListener>();

/**
 * Tracks whether or not the bubbling listener has already been added for a
 * given 'submit' event. IE11 does not support WeakSet, so a WeakMap<K, true> is
 * used instead.
 */
const submitEventSeen = new WeakMap<Event, true>();

/**
 * Adds a 'submit' event listener to `subject` that decides if / when to
 * dispatch 'formdata' events.
 */
const addSubmitListener = (subject: EventTarget) => {
  if (targetToSubmitCallback.has(subject)) {
    return;
  }

  const submitCallback = (capturingEvent: Event) => {
    // Multiple elements in the event path of `capturingEvent` may have 'submit'
    // listeners, so only continue if this is the first to see it.
    if (submitEventSeen.has(capturingEvent)) {
      return;
    }
    submitEventSeen.set(capturingEvent, true);

    // Ignore any 'submit' events that don't target forms.
    const target = getTarget(capturingEvent);
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    const submitBubblingCallback = (bubblingEvent: Event) => {
      // Filter out any other 'submit' events that might bubble to this root.
      if (bubblingEvent !== capturingEvent) {
        return;
      }

      removeEventListener.call(subject, 'submit', submitBubblingCallback);

      // If the event was cancelled, don't dispatch 'formdata'.
      if (getDefaultPrevented(bubblingEvent)) {
        return;
      }

      dispatchFormdataForSubmission(target);
    };

    // Listen for the bubbling phase of any 'submit' event that reaches the root
    // node of the tree containing the target form.
    addEventListener.call(getRootNode.call(target), 'submit', submitBubblingCallback);
  };

  // Listen for the capturing-phase of any 'submit' event.
  addEventListener.call(subject, 'submit', submitCallback, true);
  targetToSubmitCallback.set(subject, submitCallback);
};

/**
 * Removes the 'submit' event listener from `subject`.
 */
const removeSubmitListener = (subject: EventTarget) => {
  const submitCallback = targetToSubmitCallback.get(subject);
  if (submitCallback === undefined) {
    return;
  }

  removeEventListener.call(subject, 'submit', submitCallback, true);
};
