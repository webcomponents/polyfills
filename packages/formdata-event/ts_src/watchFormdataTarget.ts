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

import {FormDataEvent} from "./Wrappers/FormDataEvent.js";

// Use `WeakMap<K, true>` in place of `WeakSet` for IE11.
const submitListenerInstalled: WeakMap<EventTarget, true> = new WeakMap();
const submitEventSeen: WeakMap<Event, true> = new WeakMap();

export interface WatchFormdataTargetArgs {
  addEventListener: EventTarget['addEventListener'];
  removeEventListener: EventTarget['removeEventListener'];
  dispatchEvent: EventTarget['dispatchEvent'];
}

export const watchFormdataTarget = (subject: EventTarget, args: WatchFormdataTargetArgs) => {
  if (submitListenerInstalled.has(subject)) {
    return;
  }
  submitListenerInstalled.set(subject, true);

  args.addEventListener.call(subject, 'submit', (capturingEvent: Event) => {
    if (submitEventSeen.has(capturingEvent)) {
      return;
    }
    submitEventSeen.set(capturingEvent, true);

    const target = capturingEvent.target;
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    const submitBubblingListener = (bubblingEvent: Event) => {
      if (bubblingEvent !== capturingEvent) {
        return;
      }

      args.removeEventListener.call(subject, 'submit', submitBubblingListener);

      if (bubblingEvent.defaultPrevented) {
        return;
      }

      args.dispatchEvent.call(target, new FormDataEvent('formdata', {
        bubbles: true,
        formData: new FormData(target),
      }));
    };

    const rootNode = target.getRootNode?.() ?? target.ownerDocument;
    args.addEventListener.call(rootNode, 'submit', submitBubblingListener);
  }, true);
};
