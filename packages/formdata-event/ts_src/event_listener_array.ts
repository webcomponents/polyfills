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

interface EventListenerRecord {
  readonly callback: EventListenerOrEventListenerObject;
  readonly capture: boolean;
}

/**
 * EventListenerArray keeps track of an array of event listeners, including
 * enough information to determine if they would be deduplicated by the browser:
 * type (always 'formdata' here), the callback itself, and capture flag. See
 * https://dom.spec.whatwg.org/#add-an-event-listener for a full description of
 * the deduplicating behavior.
 */
export class EventListenerArray {
  private _listeners: Array<EventListenerRecord>;

  constructor() {
    this._listeners = new Array<EventListenerRecord>();
  }

  get length() { return this._listeners.length; }

  get capturingCount() { return this._listeners.filter(record => record.capture).length; }

  get bubblingCount() { return this._listeners.filter(record => !record.capture).length; }

  push(record: EventListenerRecord) {
    const {callback, capture} = record;

    // If this listener has the same callback and capture flag as any that
    // already exists, the browser ignores it.
    for (const existing of this._listeners) {
      if (callback === existing.callback && capture === existing.capture) {
        return;
      }
    }

    this._listeners.push(record);
  }

  delete(record: EventListenerRecord) {
    const {callback, capture} = record;

    // Remove any existing listener that matches the given arguments.
    for (let i = 0; i < this._listeners.length; i++) {
      const existing = this._listeners[i];
      if (callback === existing.callback && capture === existing.capture) {
        this._listeners.splice(i, 1);
        break;
      }
    }
  }
}
