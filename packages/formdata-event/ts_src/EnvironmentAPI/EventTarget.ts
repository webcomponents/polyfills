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

import {constructor as EventTargetCtor, methods as EventTargetMethods} from "../Environment/EventTarget.js";
import {methods as NodeMethods} from "../Environment/Node.js";

export const addEventListener: EventTarget['addEventListener'] = (() => {
  if (EventTargetCtor) {
    return EventTargetMethods.addEventListener;
  }

  return function(
    this: EventTarget,
    type: string,
    listener: EventListener | EventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    if (this instanceof Node) {
      return NodeMethods.addEventListener.call(this, type, listener, options);
    }

    throw new TypeError("Unsupported.");
  };
})();

export const removeEventListener: EventTarget['removeEventListener'] = (() => {
  if (EventTargetCtor) {
    return EventTargetMethods.removeEventListener;
  }

  return function(
    this: EventTarget,
    type: string,
    listener: EventListener | EventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ) {
    if (this instanceof Node) {
      return NodeMethods.removeEventListener.call(this, type, listener, options);
    }

    throw new TypeError("Unsupported.");
  };
})();

export const dispatchEvent: EventTarget['dispatchEvent'] = (() => {
  if (EventTargetCtor) {
    return EventTargetMethods.dispatchEvent;
  }

  return function(this: EventTarget, event: Event): boolean {
    if (this instanceof Node) {
      return NodeMethods.dispatchEvent.call(this, event);
    }

    throw new TypeError("Unsupported.");
  };
})();
