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

import {prototype as HTMLFormElementPrototype, methods as HTMLFormElementMethods} from '../Environment/HTMLFormElement.js';

export const wrapSubmit = (
  prototype: {
    submit: HTMLFormElement['submit'],
  },
  original: HTMLFormElement['submit'],
) => {
  prototype.submit = function(this: HTMLFormElement) {
    new FormData(this);
    return original.call(this);
  };
};

export const install = () => {
  if (HTMLFormElementPrototype) {
    wrapSubmit(HTMLFormElementPrototype, HTMLFormElementMethods.submit);
  }
};
