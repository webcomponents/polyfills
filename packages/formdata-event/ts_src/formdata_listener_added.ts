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

/**
 * This module takes information about 'formdata' listeners added or removed
 * from nodes and manages the listeners for 'submit' events that watch for form
 * submissions that should dispatch a 'formdata' event.
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
 * The set of 'formdata' event listeners for an event target, including enough
 * information to determine if they would be deduplicated: type (always
 * 'formdata' here), the callback itself, and capture flag. See
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
    addEventListener.call(target, 'submit', submitCallback, true);
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
    removeEventListener.call(target, 'submit', submitCallback, true);
  }
};

/**
 * Tracks whether or not the bubbling listener has already been added for a
 * given 'submit' event. IE11 does not support WeakSet, so a WeakMap<K, true> is
 * used instead.
 */
const submitEventSeen = new WeakMap<Event, true>();

/**
 * This callback listens for 'submit' events propagating through the target and
 * adds another listener that waits for those same events to reach the shallow
 * root node, where it calls `dispatchFormdataForSubmission` if the event wasn't
 * cancelled.
 */
export const submitCallback = (capturingEvent: Event) => {
  // Ignore any events that have already been seen by this callback, which could
  // be in the event's path at more than once.
  if (submitEventSeen.has(capturingEvent)) {
    return;
  }
  submitEventSeen.set(capturingEvent, true);

  // Ignore any 'submit' events that don't target forms.
  const target = getTarget(capturingEvent);
  if (!(target instanceof HTMLFormElement)) {
    return;
  }

  const shallowRoot = getRootNode(target);

  // Listen for the bubbling phase of any 'submit' event that reaches the root
  // node of the tree containing the target form.
  addEventListener.call(shallowRoot, 'submit', function bubblingCallback(bubblingEvent: Event) {
    // Ignore any other 'submit' events that might bubble to this root.
    if (bubblingEvent !== capturingEvent) {
      return;
    }

    removeEventListener.call(shallowRoot, 'submit', bubblingCallback);

    // Ignore any cancelled events.
    if (getDefaultPrevented(bubblingEvent)) {
      return;
    }

    dispatchFormdataForSubmission(target);
  });
};
