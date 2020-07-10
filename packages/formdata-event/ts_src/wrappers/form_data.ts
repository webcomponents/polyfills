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

import {constructor as FormDataConstructor, prototype as FormDataPrototype, methods as FormDataMethods} from '../environment/form_data.js';
import {dispatchEvent} from '../environment_api/event_target.js';
import {FormDataEvent} from '../form_data_event.js';
import {wrapConstructor} from './wrap_constructor.js';

interface FormDataAppendEntry {
  operation: 'append',
  name: string,
  value: string,
}

interface FormDataDeleteEntry {
  operation: 'delete',
  name: string,
}

interface FormDataSetEntry {
  operation: 'set',
  name: string,
  value: string,
}

type FormDataEntry = FormDataAppendEntry | FormDataDeleteEntry | FormDataSetEntry;

const private_entries = new WeakMap<FormData, Array<FormDataEntry>>();

export const getEntries = (formData: FormData) => private_entries.get(formData);

export const FormData: typeof window.FormData = function FormData(this: FormData, form?: HTMLFormElement) {
  const _this = new FormDataConstructor(form);
  Object.setPrototypeOf(_this, Object.getPrototypeOf(this));

  private_entries.set(_this, []);

  if (form instanceof HTMLFormElement) {
    // Using `_this` as the `formData` for this event is technically
    // incorrect. 'construct the entry list' (called by the FormData
    // constructor) actually creates a _new_ FormData, dispatches the
    // 'formdata' event with that as its `formData`, and returns the entry
    // list associated with it after the event has finished propagating. The
    // FormData constructor then takes this returned entry list and associates
    // it with itself.
    dispatchEvent.call(form, new FormDataEvent('formdata', {
      bubbles: true,
      formData: _this,
    }));
  }

  return _this;
} as Function as typeof window.FormData;

wrapConstructor(FormData, FormDataConstructor, FormDataPrototype);

FormData.prototype['append'] = function(
  this: FormData,
  name: string,
  value: string | Blob,
  _filename?: string,
) {
  const entries = private_entries.get(this)!;

  if (typeof value !== 'string') {
    throw new Error('Unsupported.');
  }

  entries.push({operation: 'append', name, value});
  return FormDataMethods.append.call(this, name, value);
};

if (FormDataMethods.delete !== undefined) {
  FormData.prototype['delete'] = function(
    this: FormData,
    name: string,
  ) {
    const entries = private_entries.get(this)!;

    entries.push({operation: 'delete', name});
    return FormDataMethods.delete.call(this, name);
  };
}

if (FormDataMethods.set !== undefined) {
  FormData.prototype['set'] = function(
    this: FormData,
    name: string,
    value: string | Blob,
    _filename?: string,
  ) {
    const entries = private_entries.get(this)!;

    if (typeof value !== 'string') {
      throw new Error('Unsupported.');
    }

    entries.push({operation: 'set', name, value});
    return FormDataMethods.set.call(this, name, value);
  };
}

export const install = () => {
  window.FormData = FormData;
};
