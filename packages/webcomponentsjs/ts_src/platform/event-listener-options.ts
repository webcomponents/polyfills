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
    let capture, once, passive;
    if (optionsOrCapture && optionsOrCapture instanceof Object) {
      capture = Boolean(optionsOrCapture.capture);
      once = Boolean(optionsOrCapture.once);
      passive = Boolean(optionsOrCapture.passive);
    } else {
      capture = Boolean(optionsOrCapture);
      once = false;
      passive = false;
    }
    return {
      capture,
      once,
      passive,
    };
  };

  const origAddEventListener = nativeEventTarget.prototype.addEventListener;
  const origRemoveEventListener =
    nativeEventTarget.prototype.removeEventListener;

  nativeEventTarget.prototype.addEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined
  ) {
    const {capture, once} = parseEventOptions(options);
    const nativeListener = once
      ? (e: Event) => {
          this.removeEventListener(type, nativeListener, capture);
          ((listener as EventListenerObject).handleEvent ?? listener)(e);
        }
      : listener;
    origAddEventListener.call(this, type, nativeListener, capture);
  };

  nativeEventTarget.prototype.removeEventListener = function (
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined
  ) {
    const {capture} = parseEventOptions(options);
    origRemoveEventListener.call(this, type, listener, capture);
  };
}
