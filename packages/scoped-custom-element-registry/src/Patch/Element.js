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

import {nativeAttachShadow} from '../Native/Element.js';
import {
  installScopedCreationMethod,
  installScopedCreationSetter,
} from './scopedFunctionInstallers.js';

export const install = () => {
  // Patch attachShadow to set customElements on shadowRoot when provided
  Element.prototype.attachShadow = function (init) {
    const shadowRoot = nativeAttachShadow.apply(this, arguments);
    if (init.customElements) {
      shadowRoot.customElements = init.customElements;
    }
    return shadowRoot;
  };

  installScopedCreationMethod(Element, 'insertAdjacentHTML');
  installScopedCreationSetter(Element, 'innerHTML');
};
