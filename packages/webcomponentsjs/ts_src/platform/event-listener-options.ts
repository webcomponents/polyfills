/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

export {};

// Older browsers like IE do not support an object as the options parameter
// to add/removeEventListener.
// https://connect.microsoft.com/IE/feedback/details/790389/event-defaultprevented-returns-false-after-preventdefault-was-called
const supportsEventOptions = (() => {
  let supported = false;
  const eventOptions = {
    get capture() {
      supported = true;
      return false;
    },
  };
  const listener = () => {};
  // NOTE: These will be unpatched at this point.
  window.addEventListener('test', listener, eventOptions);
  window.removeEventListener('test', listener, eventOptions);
  return supported;
})();

const nativeEventTarget = window.EventTarget ?? window.Node;

if (
  !supportsEventOptions &&
  'addEventListener' in nativeEventTarget.prototype
) {
  const parseEventOptions = (
    optionsOrCapture?: boolean | AddEventListenerOptions
  ) => {
    let capture, once;
    if (
      optionsOrCapture &&
      (typeof optionsOrCapture === 'object' ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (optionsOrCapture as any) instanceof Object)
    ) {
      capture = Boolean((optionsOrCapture as AddEventListenerOptions).capture);
      once = Boolean((optionsOrCapture as AddEventListenerOptions).once);
    } else {
      capture = Boolean(optionsOrCapture);
      once = false;
    }
    return {
      capture,
      once,
    };
  };

  const origAddEventListener = nativeEventTarget.prototype.addEventListener;
  const origRemoveEventListener =
    nativeEventTarget.prototype.removeEventListener;

  const captureListenerMap = new WeakMap();
  const listenerMap = new WeakMap();

  const getListenerMap = (
    target: EventTarget,
    type: string,
    capture: boolean
  ) => {
    const elMap = capture ? captureListenerMap : listenerMap;
    let typeMap = elMap.get(target);
    if (typeMap === undefined) {
      elMap.set(target, (typeMap = new Map()));
    }
    let listeners = typeMap.get(type);
    if (listeners === undefined) {
      typeMap.set(type, (listeners = new WeakMap()));
    }
    return listeners;
  };

  nativeEventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined
  ) {
    if (listener == null) {
      return;
    }
    const {capture, once} = parseEventOptions(options);
    const map = getListenerMap(this, type, capture);
    if (!map.has(listener)) {
      const cachedListener = once
        ? (e: Event) => {
            map.delete(listener);
            origRemoveEventListener.call(this, type, cachedListener, capture);
            ((listener as EventListenerObject).handleEvent ?? listener)(e);
          }
        : listener;
      map.set(listener, cachedListener);
      origAddEventListener.call(this, type, cachedListener, capture);
    }
  };

  nativeEventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined
  ) {
    if (listener == null) {
      return;
    }
    const {capture} = parseEventOptions(options);
    const map = getListenerMap(this, type, capture);
    const cachedListener = map.get(listener);
    if (cachedListener !== undefined) {
      map.delete(listener);
      origRemoveEventListener.call(this, type, cachedListener, capture);
    }
  };
}
