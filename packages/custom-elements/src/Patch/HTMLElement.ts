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

import AlreadyConstructedMarker from '../AlreadyConstructedMarker.js';
import CustomElementInternals from '../CustomElementInternals.js';
import CEState from '../CustomElementState.js';
import {Constructor} from '../Externs.js';
import * as Native from './Native.js';

export default function(internals: CustomElementInternals) {
  const PatchedHTMLElement = function HTMLElement(this: HTMLElement) {
    // This should really be `new.target` but `new.target` can't be
    // emulated in ES5. Assuming the user keeps the default value of the
    // constructor's prototype's `constructor` property, this is
    // equivalent.
    const constructor = this.constructor as Constructor<HTMLElement>;

    // Always look up the definition from the global registry.
    const registry = document.__CE_registry!;
    const definition = registry.internal_constructorToDefinition(constructor);
    if (!definition) {
      throw new Error(
          'Failed to construct a custom element: ' +
          'The constructor was not registered with `customElements`.');
    }

    const constructionStack = definition.constructionStack;

    if (constructionStack.length === 0) {
      const element = (Native.Document_createElement.call(
                          document, definition.localName)) as HTMLElement;
      Object.setPrototypeOf(element, constructor.prototype as typeof element);
      element.__CE_state = CEState.custom;
      element.__CE_definition = definition;
      internals.patchElement(element);
      return element;
    }

    const lastIndex = constructionStack.length - 1;
    const element = constructionStack[lastIndex];
    if (element === AlreadyConstructedMarker) {
      const localName = definition.localName;
      throw new Error(
          'Failed to construct \'' + localName + '\': ' +
          'This element was already constructed.');
    }
    const toConstructElement = element as HTMLElement;
    constructionStack[lastIndex] = AlreadyConstructedMarker;

    Object.setPrototypeOf(
        toConstructElement, constructor.prototype as typeof toConstructElement);
    internals.patchElement(toConstructElement);

    return toConstructElement;
  };

  PatchedHTMLElement.prototype = Native.HTMLElement.prototype;
  // Safari 9 has `writable: false` on the propertyDescriptor
  // Make it writable so that TypeScript can patch up the
  // constructor in the ES5 compiled code.
  Object.defineProperty(HTMLElement.prototype, 'constructor', {
    writable: true,
    configurable: true,
    enumerable: false,
    value: PatchedHTMLElement
  });

  window['HTMLElement'] = PatchedHTMLElement as unknown as typeof HTMLElement;
}
