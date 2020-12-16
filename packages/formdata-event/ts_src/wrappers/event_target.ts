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

import {
  prototype as EventTargetPrototype,
  methods as EventTargetMethods,
} from '../environment/event_target.js';
import {
  prototype as NodePrototype,
  methods as NodeMethods,
} from '../environment/node.js';
import {
  prototype as WindowPrototype,
  methods as WindowMethods,
} from '../environment/window.js';
import {
  formdataListenerAdded,
  formdataListenerRemoved,
  wrapSubmitListener,
} from '../formdata_listener_added.js';
import {
  submitListenerAdded,
  submitListenerRemoved,
} from '../submit_listener_added.js';

const submitListenerToWrapper = new WeakMap<
  EventListenerOrEventListenerObject,
  EventListener
>();

export const wrapAddEventListener = (
  prototype: {
    addEventListener: EventTarget['addEventListener'];
  },
  original: EventTarget['addEventListener']
) => {
  prototype.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (type === 'submit' && listener !== null) {
      const wrapper = wrapSubmitListener(listener);
      submitListenerToWrapper.set(listener, wrapper);
      listener = wrapper;
    }

    const result = original.call(this, type, listener, options);

    if (type === 'formdata') {
      formdataListenerAdded(this, listener, options);
    } else if (type === 'submit' && listener !== null) {
      submitListenerAdded(this, listener, options);
    }

    return result;
  };
};

export const wrapRemoveEventListener = (
  prototype: {
    removeEventListener: EventTarget['removeEventListener'];
  },
  original: EventTarget['removeEventListener']
) => {
  prototype.removeEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ) {
    if (type === 'submit' && listener !== null) {
      listener = submitListenerToWrapper.get(listener) ?? listener;
    }

    const result = original.call(this, type, listener, options);

    if (type === 'formdata') {
      formdataListenerRemoved(this, listener, options);
    } else if (type === 'submit' && listener !== null) {
      submitListenerRemoved(this, listener, options);
    }

    return result;
  };
};

export const install = () => {
  if (EventTargetPrototype) {
    wrapAddEventListener(
      EventTargetPrototype,
      EventTargetMethods.addEventListener
    );
    wrapRemoveEventListener(
      EventTargetPrototype,
      EventTargetMethods.removeEventListener
    );
  }

  if (NodeMethods.addEventListener) {
    wrapAddEventListener(NodePrototype, NodeMethods.addEventListener);
    wrapRemoveEventListener(NodePrototype, NodeMethods.removeEventListener);
  }

  if (WindowMethods.addEventListener) {
    wrapAddEventListener(WindowPrototype, WindowMethods.addEventListener);
    wrapRemoveEventListener(WindowPrototype, WindowMethods.removeEventListener);
  }
};
