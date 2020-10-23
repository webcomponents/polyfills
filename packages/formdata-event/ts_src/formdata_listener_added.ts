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

import {getEventPropagationStopped, getEventPropagationImmediatelyStopped} from './wrappers/event.js';
import {getTarget, getDefaultPrevented} from './environment_api/event.js';
import {addEventListener, removeEventListener} from './environment_api/event_target.js';
import {getRootNode} from './environment_api/node.js';
import {dispatchFormdataForSubmission} from './dispatch_formdata_for_submission.js';
import {EventListenerArray} from './event_listener_array.js';
import {submitListenerAdded, submitListenerRemoved, targetToSubmitListeners} from './submit_listener_added.js';

/**
 * The set of 'formdata' event listeners for an event target.
 */
const targetToFormdataListeners = new WeakMap<EventTarget, EventListenerArray>();

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
    const listeners = new EventListenerArray();
    listeners.push({callback, capture});
    targetToFormdataListeners.set(target, listeners);
    addEventListener.call(target, 'submit', submitCallback, true);
    return;
  }

  formdataListeners.push({callback, capture});
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
  // Event listeners with null callbacks aren't stored.
  if (!callback) {
    return;
  }

  const formdataListeners = targetToFormdataListeners.get(target);
  if (formdataListeners === undefined) {
    return;
  }

  const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);

  formdataListeners.delete({callback, capture});

  // When the last 'formdata' event listener is removed, also remove the
  // 'submit' listener.
  if (formdataListeners.length === 0) {
    targetToFormdataListeners.delete(target);
    removeEventListener.call(target, 'submit', submitCallback, true);
  }
};

/**
 * Tracks whether or not a given 'submit' event has already been seen by
 * `submitCallback`. IE11 does not support WeakSet, so a WeakMap<K, true> is
 * used instead.
 */
const submitEventSeen = new WeakMap<Event, true>();

interface SubmitEventBubblingListener {
  readonly target: EventTarget;
  readonly callback: EventListener;
}

/**
 * Tracks the bubbling listener added for a given 'submit' event.
 */
const submitEventToListenerInfo = new WeakMap<Event, SubmitEventBubblingListener>();

/**
 * This callback listens for 'submit' events propagating through the target and
 * adds another listener that waits for those same events to reach the shallow
 * root node, where it calls `dispatchFormdataForSubmission` if the event wasn't
 * cancelled.
 */
const submitCallback = (capturingEvent: Event) => {
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

  // The wrapper generated here will dispatch a 'formdata' event if this
  // 'submit' event bubbles all the way to `shallowRoot`.
  const bubblingCallback = wrapSubmitListener(() => {});
  submitEventToListenerInfo.set(capturingEvent, {
    target: shallowRoot,
    callback: bubblingCallback,
  });

  // Listen for the bubbling phase of any 'submit' event that reaches the root
  // node of the tree containing the target form.
  addEventListener.call(shallowRoot, 'submit', bubblingCallback);
  submitListenerAdded(shallowRoot, bubblingCallback);
};

/**
 * All 'submit' event listeners added by the user or polyfill (_except_ the
 * bubbling listener above) should be wrapped by this function. All 'formdata'
 * events dispatched as a result of observing a 'submit' event are dispatched by
 * one of these wrappers.
 */
export const wrapSubmitListener = (listener: EventListenerOrEventListenerObject): EventListener => {
  return function wrapper(this: EventTarget, e: Event, ...rest) {
    const result: any = typeof listener === "function" ?
        listener.call(this, e, ...rest) :
        listener.handleEvent(e, ...rest);

    // An event's propagation may be stopped before it reaches the capturing
    // 'submit' listener, so we need to check that this is a 'submit' event that
    // would result in a 'formdata' event here as well.
    const targetIsAForm = getTarget(e) instanceof HTMLFormElement;

    // If the event's propagation was immediately stopped (potentially before
    // being seen by the capturing 'submit' listener), dispatch a 'formdata'
    // event.
    if (getEventPropagationImmediatelyStopped(e) && targetIsAForm) {
      maybeDispatchFormdataForEvent(e);
    // If the event's propagation was stopped (potentially before being seen by
    // the capturing 'submit' listener) and this is the _last_ callback for its
    // event phase, dispatch a 'formdata' event.
    } else if (getEventPropagationStopped(e) && targetIsAForm) {
      const submitListeners = targetToSubmitListeners.get(this)!;
      const {lastCapturingCallback, lastBubblingCallback} = submitListeners;

      if (wrapper === lastCapturingCallback || wrapper === lastBubblingCallback) {
        maybeDispatchFormdataForEvent(e);
      }
    // If this listener is the _last_ bubbling 'submit' event listener attached
    // to the shallow root of the event's target (possibly the one added by the
    // capturing listener), dispatch a 'formdata' event.
    } else if (submitEventToListenerInfo.has(e)) {
      const listenerInfo = submitEventToListenerInfo.get(e);
      if (listenerInfo !== undefined && this === listenerInfo.target) {
        const submitListeners = targetToSubmitListeners.get(this)!;
        const {lastBubblingCallback} = submitListeners;

        if (wrapper === lastBubblingCallback) {
          maybeDispatchFormdataForEvent(e);
        }
      }
    }

    return result;
  };
};

/**
 * Dispatches a 'formdata' event for a 'submit' event that has finished
 * propagating through the tree, if the 'submit' wasn't cancelled.
 */
const maybeDispatchFormdataForEvent = (e: Event) => {
  // Remove the bubbling 'submit' event listener, if one was added for this
  // event (i.e. if the capturing listener saw the event).
  const listenerInfo = submitEventToListenerInfo.get(e);
  if (listenerInfo) {
    const {target, callback} = listenerInfo;
    removeEventListener.call(target, 'submit', callback);
    submitListenerRemoved(target, callback);
    submitEventToListenerInfo.delete(e);
  }

  // Dispatch a 'formdata' event if the 'submit' event wasn't cancelled.
  if (!getDefaultPrevented(e)) {
    dispatchFormdataForSubmission(getTarget(e));
  }
};
