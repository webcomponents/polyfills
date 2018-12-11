/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from '../utils.js';
import {eventPropertyNames} from '../patch-events.js';
import {shadyDataForNode, ensureShadyDataForNode} from '../shady-data.js';

export const HTMLElementPatches = utils.getOwnPropertyDescriptors({

  /** @this {HTMLElement} */
  blur() {
    const nodeData = shadyDataForNode(this);
    let root = nodeData && nodeData.root;
    let shadowActive = root && root.activeElement;
    if (shadowActive) {
      shadowActive[utils.SHADY_PREFIX + 'blur']();
    } else {
      this[utils.NATIVE_PREFIX + 'blur']();
    }
  }

});

eventPropertyNames.forEach(property => {
  HTMLElementPatches[property] = {
    /** @this {HTMLElement} */
    set: function(fn) {
      const shadyData = ensureShadyDataForNode(this);
      const eventName = property.substring(2);
      shadyData.__onCallbackListeners[property] && this.removeEventListener(eventName, shadyData.__onCallbackListeners[property]);
      this[utils.SHADY_PREFIX + 'addEventListener'](eventName, fn);
      shadyData.__onCallbackListeners[property] = fn;
    },
    /** @this {HTMLElement} */
    get() {
      const shadyData = shadyDataForNode(this);
      return shadyData && shadyData.__onCallbackListeners[property];
    },
    configurable: true
  };
});

