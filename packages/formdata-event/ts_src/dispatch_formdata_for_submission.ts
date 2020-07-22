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

import {getEntries} from './wrappers/form_data.js';

/**
 * Dispatches a 'formdata' event to `form` and modifies the form to reflect any
 * changes made to the `FormData` instance that was sent along with the event.
 *
 * In browsers without native support for the 'formdata' event, the only way to
 * affect the data sent during form submission is to modify the form-associated
 * elements in the form before it is submitted. The form can be modified up
 * until the 'submit' event has completed dispatch.
 */
export const dispatchFormdataForSubmission = (form: HTMLFormElement) => {
  // Constructing this FormData _synchronously_ dispatches the 'formdata' event
  // to `form` and, once complete, `formData` can be used to retrieve any
  // changes to the entry list.
  const formData = new FormData(form);

  /**
   * Any inputs inserted into the form while modifying it to match entries of
   * `formData`.
   */
  const insertedInputs: Array<HTMLInputElement> = [];

  /**
   * Appends a hidden input to the form with the given name and value.
   */
  const appendEntry = (name: string, value: string) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;

    form.appendChild(input);
    insertedInputs.push(input);
  };

  /**
   * The initial value of the 'disabled' attribute of any form-associated
   * element that has its 'disabled' attribute modified to match entries of
   * `formData`.
   */
  const disabledInitialValue = new Map<Element, string | null>();

  /**
   * Disables any form-associated elements that have the given name, including
   * those inserted by `appendEntry`.
   */
  const disableExistingEntries = (name: string) => {
    for (let i = 0; i < form.elements.length; i++) {
      const element = form.elements[i];
      if (element.getAttribute('name') === name) {
        if (!disabledInitialValue.has(element)) {
          disabledInitialValue.set(element, element.getAttribute('disabled'));
        }

        element.setAttribute('disabled', '');
      }
    }
  };

  /**
   * Finds the first non-disabled form-associated element with a given name.
   */
  const findFirstEnabledElement = (name: string): Element | undefined => {
    for (let i = 0; i < form.elements.length; i++) {
      const element = form.elements[i];
      if (element.getAttribute('name') === name && !element.hasAttribute('disabled')) {
        return element;
      }
    }
    return undefined;
  };

  // Update the form to match the entries in `formData`.
  for (const entry of getEntries(formData)!) {
    switch (entry.operation) {
      case 'append': {
        appendEntry(entry.name, entry.value);
      } break;

      case 'delete': {
        disableExistingEntries(entry.name);
      } break;

      case 'set': {
        const {name, value} = entry;
        const first = findFirstEnabledElement(name);

        // If there are no entries (i.e. enabled, form-associated elements) with
        // the given name, then setting an entry is the same as appending it.
        if (first === undefined) {
          appendEntry(name, value);
        // If there are entries with the given name, then setting an entry
        // should overwrite the _first_ entry in the list with that name and
        // delete all other entries.
        } else {
          disableExistingEntries(name);

          // Insert the input representing the new entry into the form
          // immediately before the first enabled element with that name (before
          // it was disabled above) so that it appears to replace it in the
          // entry list.
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          first.parentNode!.insertBefore(input, first);
          insertedInputs.push(input);
        }
      } break;

      default:
        throw new Error('UNREACHABLE');
    }
  }

  // Undo any modifications made to the form.
  //
  // This is delayed until at least the next task because the browser will read
  // data out of the form when the current task completes. Typically, the form
  // will already have been submitted and the page will be destroyed before this
  // runs.
  setTimeout(() => {
    // Remove any inserted inputs.
    for (const input of insertedInputs) {
      input.parentNode?.removeChild(input);
    }

    // Restore the 'disabled' attribute state of any modified form elements.
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
