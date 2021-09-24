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

import {Event} from './wrappers/event.js';

interface FormEventInit extends EventInit {
  // `formData` is required, but user-supplied outside of TS, so it's marked as
  // optional here and is manually checked in the `FormDataEvent` constructor.
  formData?: FormData;
}

const private_formData: WeakMap<FormDataEvent, FormData> = new WeakMap();

export class FormDataEvent extends Event {
  constructor(type: string, formEventInit: FormEventInit = {}) {
    super(type, formEventInit);
    const formData = formEventInit.formData;
    if (!(formData instanceof FormData)) {
      throw new TypeError(
        "Failed to construct 'FormDataEvent': member " +
          'formData is not of type FormData.'
      );
    }
    private_formData.set(this, formData);
  }

  get formData() {
    return private_formData.get(this);
  }
}

declare global {
  interface Window {
    FormDataEvent: typeof FormDataEvent;
  }
}

export const install = () => {
  Object.defineProperty(window, 'FormDataEvent', {
    writable: true,
    enumerable: false,
    configurable: true,
    value: FormDataEvent,
  });
};
