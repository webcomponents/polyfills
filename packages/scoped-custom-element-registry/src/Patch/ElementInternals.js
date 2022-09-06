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

import {definitionForElement, internalsToHostMap} from '../sharedState.js';

export const install = () => {
  if (window['ElementInternals']?.prototype['setFormValue']) {
    const methods = [
      'setFormValue',
      'setValidity',
      'checkValidity',
      'reportValidity',
    ];

    methods.forEach((method) => {
      const proto = window['ElementInternals'].prototype;
      const originalMethod = proto[method];

      proto[method] = function (...args) {
        const host = internalsToHostMap.get(this);
        const definition = definitionForElement.get(host);
        if (definition['formAssociated'] === true) {
          originalMethod?.call(this, ...args);
        } else {
          throw new DOMException(
            `Failed to execute ${originalMethod} on 'ElementInternals': The target element is not a form-associated custom element.`
          );
        }
      };
    });
  }
};
