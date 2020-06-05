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

import {prototype as EventTargetPrototype, methods as EventTargetMethods} from "../Environment/EventTarget.js";
import {prototype as NodePrototype, methods as NodeMethods} from "../Environment/Node.js";
import {watchFormdataTarget, WatchFormdataTargetArgs} from "../watchFormdataTarget.js";

export const wrapAddEventListener = (prototype: any, original: EventTarget['addEventListener'], methods: WatchFormdataTargetArgs) => {
  prototype.addEventListener = function(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions) {
    if (type === 'formdata') {
      watchFormdataTarget(this, methods);
    }

    return original.call(this, type, listener, options);
  };
};

export const install = () => {
  if (EventTargetPrototype) {
    wrapAddEventListener(EventTargetPrototype, EventTargetMethods.addEventListener, EventTargetMethods);
  } else if (NodeMethods.addEventListener) {
    wrapAddEventListener(NodePrototype, NodeMethods.addEventListener, NodeMethods);
  }
};
