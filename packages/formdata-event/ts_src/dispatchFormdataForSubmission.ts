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
  const disabledInitialValue = new Map<Element, string | null>();
  const setDisabled = (element: Element, value: boolean) => {
    if (!disabledInitialValue.has(element)) {
      disabledInitialValue.set(element, element.getAttribute('disabled'));
    }

    if (value) {
      element.setAttribute('disabled', '');
    } else {
      element.removeAttribute('disabled');
    }
  };

  for (const entry of getEntries(formData)!) {
    switch (entry.operation) {
      case 'append': {
        const {name, value} = entry;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
        insertedInputs.push(input);
      } break;

      case 'delete': {
        const {name} = entry;

        for (let i = 0; i < form.elements.length; i++) {
          const element = form.elements[i];
          if (element.getAttribute('name') === name) {
            setDisabled(element, true);
          }
        }
      } break;

      default:
        throw new Error('UNREACHABLE');
    }
  }

  setTimeout(() => {
    for (const input of insertedInputs) {
      input.parentNode?.removeChild(input);
    }

    for (const [element, value] of disabledInitialValue) {
      if (element.getAttribute('disabled') !== value) {
        if (value === null) {
          element.removeAttribute('disabled');
        } else {
          element.setAttribute('disabled', value);
        }
      }
    }
  });
};