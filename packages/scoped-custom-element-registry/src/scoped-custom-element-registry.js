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

import {definitionForElement} from './sharedState.js';
import {install as installCustomElementRegistry} from './Patch/CustomElementRegistry.js';
import {install as installElement} from './Patch/Element.js';
import {install as installHTMLElement} from './Patch/HTMLElement.js';
import {install as installShadowRoot} from './Patch/ShadowRoot.js';

if (!ShadowRoot.prototype.createElement) {
  installCustomElementRegistry();
  installElement();
  installHTMLElement();
  installShadowRoot();

  // Install global registry
  Object.defineProperty(window, 'customElements', {
    value: new CustomElementRegistry(),
    configurable: true,
    writable: true,
  });

  if (
    !!window['ElementInternals'] &&
    !!window['ElementInternals'].prototype['setFormValue']
  ) {
    const internalsToHostMap = new WeakMap();
    const attachInternals = HTMLElement.prototype['attachInternals'];
    const methods = [
      'setFormValue',
      'setValidity',
      'checkValidity',
      'reportValidity',
    ];

    HTMLElement.prototype['attachInternals'] = function (...args) {
      const internals = attachInternals.call(this, ...args);
      internalsToHostMap.set(internals, this);
      return internals;
    };

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

    // Emulate the native RadioNodeList object
    class RadioNodeList extends Array {
      constructor(elements) {
        super(...elements);
        this._elements = elements;
      }

      get ['value']() {
        return (
          this._elements.find((element) => element['checked'] === true)
            ?.value || ''
        );
      }
    }

    // Emulate the native HTMLFormControlsCollection object
    class HTMLFormControlsCollection {
      constructor(elements) {
        const entries = new Map();
        elements.forEach((element, index) => {
          const name = element.getAttribute('name');
          const nameReference = entries.get(name) || [];
          this[+index] = element;
          nameReference.push(element);
          entries.set(name, nameReference);
        });
        this['length'] = elements.length;
        entries.forEach((value, key) => {
          if (!value) return;
          if (value.length === 1) {
            this[key] = value[0];
          } else {
            this[key] = new RadioNodeList(value);
          }
        });
      }

      ['namedItem'](key) {
        return this[key];
      }
    }

    // Override the built-in HTMLFormElements.prototype.elements getter
    const formElementsDescriptor = Object.getOwnPropertyDescriptor(
      HTMLFormElement.prototype,
      'elements'
    );

    Object.defineProperty(HTMLFormElement.prototype, 'elements', {
      get: function () {
        const nativeElements = formElementsDescriptor.get.call(this, []);

        const include = [];

        for (const element of nativeElements) {
          const definition = definitionForElement.get(element);

          // Only purposefully formAssociated elements or built-ins will feature in elements
          if (!definition || definition['formAssociated'] === true) {
            include.push(element);
          }
        }

        return new HTMLFormControlsCollection(include);
      },
    });
  }
}
