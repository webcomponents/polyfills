/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {creationContext, scopeForElement} from '../sharedState.js';

// Install scoped creation API on Element & ShadowRoot
export const installScopedCreationMethod = (ctor, method, from = undefined) => {
  const native = (from ? Object.getPrototypeOf(from) : ctor.prototype)[method];
  ctor.prototype[method] = function () {
    creationContext.push(this);
    const ret = native.apply(from || this, arguments);
    // For disconnected elements, note their creation scope so that e.g.
    // innerHTML into them will use the correct scope; note that
    // insertAdjacentHTML doesn't return an element, but that's fine since
    // it will have a parent that should have a scope
    if (ret !== undefined) {
      scopeForElement.set(ret, this);
    }
    creationContext.pop();
    return ret;
  };
};

// Install scoped innerHTML on Element & ShadowRoot
export const installScopedCreationSetter = (ctor, name) => {
  const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, name);
  Object.defineProperty(ctor.prototype, name, {
    ...descriptor,
    set(value) {
      creationContext.push(this);
      descriptor.set.call(this, value);
      creationContext.pop();
    },
  });
};
