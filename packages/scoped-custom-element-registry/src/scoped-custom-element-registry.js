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

import {install as installCustomElementRegistry} from './Patch/CustomElementRegistry.js';
import {install as installElement} from './Patch/Element.js';
import {install as installElementInternals} from './Patch/ElementInternals.js';
import {install as installHTMLElement} from './Patch/HTMLElement.js';
import {install as installHTMLFormElement} from './Patch/HTMLFormElement.js';
import {install as installShadowRoot} from './Patch/ShadowRoot.js';

if (!ShadowRoot.prototype.createElement) {
  installCustomElementRegistry();
  installElement();
  installElementInternals();
  installHTMLElement();
  installHTMLFormElement();
  installShadowRoot();

  // Install global registry
  Object.defineProperty(window, 'customElements', {
    value: new CustomElementRegistry(),
    configurable: true,
    writable: true,
  });
}
