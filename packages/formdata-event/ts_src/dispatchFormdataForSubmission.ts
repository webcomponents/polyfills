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

import {getEntries} from './Wrappers/FormData.js';

export const dispatchFormdataForSubmission = (form: HTMLFormElement) => {
  // Constructing this FormData with `form` dispatches the 'formdata' event.
  const formData = new FormData(form);
  const insertedInputs: Array<HTMLInputElement> = [];

  for (const {name, value} of getEntries(formData)!) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
    insertedInputs.push(input);
  }

  setTimeout(() => {
    for (const input of insertedInputs) {
      input.parentNode?.removeChild(input);
    }
  });
};
