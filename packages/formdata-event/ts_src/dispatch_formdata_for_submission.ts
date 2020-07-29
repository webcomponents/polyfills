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

/**
 * This module handles dispatching the 'formdata' event to a form and modifying
 * the form to reflect any changes that any listeners make to the FormData
 * object passed along with the event.
 */

import {methods as DocumentMethods} from './environment/document.js';
import {document} from './environment/globals.js';
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
   * Inserts a hidden input to the form with the given name and value. By
   * default, the input is appended to the end of the form; passing
   * `insertBeforeNode` will insert the new input before that node.
   */
  const insertEntry = (name: string, value: string, beforeNode?: Node) => {
    const input = DocumentMethods.createElement.call(document, 'input') as HTMLInputElement;
    input.type = 'hidden';
    input.name = name;
    input.value = value;

    if (beforeNode !== undefined) {
      beforeNode.parentNode!.insertBefore(input, beforeNode);
    } else {
      form.appendChild(input);
    }
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
   * those inserted by `insertEntry`.
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
        insertEntry(entry.name, entry.value);
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
          insertEntry(name, value);
        // Otherwise, setting an entry means overwriting the _first_ entry in
        // the list with that name and delete all other entries.
        } else {
          disableExistingEntries(name);
          // Insert before `first` so that the new input appears in `first`'s
          // old position in the entry list.
          insertEntry(name, value, first);
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
