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

// defaultPrevented is broken in IE.
// https://connect.microsoft.com/IE/feedback/details/790389/event-defaultprevented-returns-false-after-preventdefault-was-called
const workingDefaultPrevented = (() => {
  const e = document.createEvent('Event');
  e.initEvent('foo', true, true);
  e.preventDefault();
  return e.defaultPrevented;
})();

if (!workingDefaultPrevented) {
  const origPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function(this: Event) {
    if (!this.cancelable) {
      return;
    }

    origPreventDefault.call(this);

    Object.defineProperty(this, 'defaultPrevented', {
      get() {
        return true;
      },
      configurable: true
    });
  };
}

const isIE = /Trident/.test(navigator.userAgent);

// Event constructor shim
if (!window.Event || isIE && (typeof window.Event !== 'function')) {
  const origEvent = window.Event as typeof Event;
  window['Event'] =
      ((inType: string, params?: EventInit) => {
        params = params || {};
        const e = document.createEvent('Event');
        e.initEvent(
            inType, Boolean(params.bubbles), Boolean(params.cancelable));
        return e;
      }) as unknown as typeof Event;
  if (origEvent) {
    // tslint:disable-next-line:forin
    for (const i in origEvent) {
      // tslint:disable-next-line:no-any
      (window['Event'] as any)[i] = (origEvent as any)[i];
    }
    window['Event'].prototype = origEvent.prototype;
  }
}

// CustomEvent constructor shim
if (!window.CustomEvent || isIE && (typeof window.CustomEvent !== 'function')) {
  window['CustomEvent'] =
      (<T extends unknown>(inType: string, params?: CustomEventInit<T>) => {
        params = params || {};
        const e: CustomEvent<T> = document.createEvent('CustomEvent');
        e.initCustomEvent(
            inType, Boolean(params.bubbles), Boolean(params.cancelable),
            params.detail!);
        return e;
      }) as unknown as typeof CustomEvent;
  window['CustomEvent'].prototype = window.Event.prototype as CustomEvent;
}

if (!window.MouseEvent || isIE && (typeof window.MouseEvent !== 'function')) {
  const origMouseEvent = window.MouseEvent as typeof MouseEvent;
  window['MouseEvent'] =
      ((inType: string, params?: MouseEventInit) => {
        params = params || {};
        const e = document.createEvent('MouseEvent');
        e.initMouseEvent(
            inType, Boolean(params.bubbles), Boolean(params.cancelable),
            params.view || window, params.detail!, params.screenX!,
            params.screenY!, params.clientX!, params.clientY!, params.ctrlKey!,
            params.altKey!, params.shiftKey!, params.metaKey!, params.button!,
            params.relatedTarget!);
        return e;
      }) as unknown as typeof MouseEvent;
  if (origMouseEvent) {
    // tslint:disable-next-line:forin
    for (const j in origMouseEvent) {
      // tslint:disable-next-line:no-any
      (window.MouseEvent as any)[j] = (origMouseEvent as any)[j];
    }
  }
  window['MouseEvent'].prototype = origMouseEvent.prototype;
}
