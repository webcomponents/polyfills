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

import {getTarget, getDefaultPrevented} from './EnvironmentAPI/Event.js';
import {addEventListener, removeEventListener} from './EnvironmentAPI/EventTarget.js';
import {getRootNode} from './EnvironmentAPI/Node.js';

interface FormdataEventListenerRecord {
  callback: EventListenerOrEventListenerObject;
  capture: boolean;
}

const targetToFormdataListeners = new WeakMap<EventTarget, Set<FormdataEventListenerRecord>>();

export const formdataListenerAdded = (
  target: EventTarget,
  callback: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions,
) => {
  if (!callback) {
    return;
  }

  const capture = typeof options === 'boolean' ? options : (options?.capture ?? false);
  const formdataListeners = targetToFormdataListeners.get(target);

  if (formdataListeners !== undefined) {
    for (const existing of formdataListeners) {
      if (callback === existing.callback && capture === existing.capture) {
        return;
      }
    }
  }

  if (formdataListeners === undefined) {
    targetToFormdataListeners.set(target, new Set([{callback, capture}]));
    addSubmitListener(target);
  } else {
    formdataListeners.add({callback, capture});
  }
};

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

  for (const existing of formdataListeners) {
    if (callback === existing.callback && capture === existing.capture) {
      formdataListeners.delete(existing);
      break;
    }
  }

  if (formdataListeners.size === 0) {
    targetToFormdataListeners.delete(target);
    removeSubmitListener(target);
  }
};

// Tracks the 'submit' event listener applied to each EventTarget that has at
// least one 'formdata' event listener.
const targetToSubmitListener = new WeakMap<EventTarget, EventListener>();
// Tracks whether or not the bubbling listener has already been added for a
// given 'submit' event.
// IE11 does not support WeakSet, so a WeakMap<K, true> is used instead.
const submitEventSeen = new WeakMap<Event, true>();

const addSubmitListener = (subject: EventTarget) => {
  if (targetToSubmitListener.has(subject)) {
    return;
  }

  const submitListener = (capturingEvent: Event) => {
    if (submitEventSeen.has(capturingEvent)) {
      return;
    }
    submitEventSeen.set(capturingEvent, true);

    const target = getTarget(capturingEvent);
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    const submitBubblingListener = (bubblingEvent: Event) => {
      if (bubblingEvent !== capturingEvent) {
        return;
      }

      removeEventListener.call(subject, 'submit', submitBubblingListener);

      if (getDefaultPrevented(bubblingEvent)) {
        return;
      }

      // Constructing this FormData with `target` causes the 'formdata' event to
      // be dispatched to it.
      new FormData(target);
    };

    addEventListener.call(getRootNode.call(target), 'submit', submitBubblingListener);
  };

  addEventListener.call(subject, 'submit', submitListener, true);
  targetToSubmitListener.set(subject, submitListener);
};

const removeSubmitListener = (subject: EventTarget) => {
  const callback = targetToSubmitListener.get(subject);
  if (callback === undefined) {
    return;
  }

  removeEventListener.call(subject, 'submit', callback);
};
