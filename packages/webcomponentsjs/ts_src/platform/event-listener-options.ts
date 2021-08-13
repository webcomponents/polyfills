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
  let onceSupported = false;
  const eventOptions = {
    get capture() {
      supported = true;
      return true;
    },

    get once() {
      onceSupported = true;
      return true;
    },
  };
  let callCount = 0;
  const listener = () => {
    callCount++;
  };
  const d = document.createElement('div');
  // NOTE: These will be unpatched at this point.
  d.addEventListener('click', listener, eventOptions);
  let fullySupported = supported && onceSupported;
  // Once + capture broken on Edge >= 17 < 79.
  if (fullySupported) {
    d.dispatchEvent(new Event('click'));
    d.dispatchEvent(new Event('click'));
    fullySupported = callCount == 1;
  }
  d.removeEventListener('click', listener, eventOptions);
  return fullySupported;
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
        typeof optionsOrCapture === 'function')
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

  type ListenerMap = WeakMap<
    EventListenerOrEventListenerObject,
    EventListenerOrEventListenerObject | null
  >;
  type TypeMap = Map<string, ListenerMap>;
  type ElementListenerMap = WeakMap<EventTarget, TypeMap>;

  const captureListenerMap: ElementListenerMap = new WeakMap();
  const listenerMap: ElementListenerMap = new WeakMap();

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
            if (typeof listener === 'function') {
              return listener.call(this, e);
            }

            const handleEvent = listener?.handleEvent;
            if (typeof handleEvent === 'function') {
              return handleEvent.call(e.currentTarget, e);
            }
          }
        : null;
      map.set(listener, cachedListener);
      // Note, the cached listener is null if no wrapper is used to avoid
      // a strong ref to it;
      origAddEventListener.call(
        this,
        type,
        cachedListener ?? listener,
        capture
      );
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
      // Note, the cached listener is null if no wrapper was used so that a
      // strong ref to it is not kept.
      origRemoveEventListener.call(
        this,
        type,
        cachedListener ?? listener,
        capture
      );
    }
  };
}
