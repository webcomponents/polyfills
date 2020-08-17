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

export class EventListenerArray {
  #listeners = new Array<EventListenerRecord>();

  get length() { return this.#listeners.length; }

  push(record: EventListenerRecord) {
    const {callback, capture} = record;

    // If this listener has the same callback and capture flag as any that
    // already exists, the browser ignores it.
    for (const existing of this.#listeners) {
      if (callback === existing.callback && capture === existing.capture) {
        return;
      }
    }

    this.#listeners.push(record);
  }

  delete(record: EventListenerRecord) {
    const {callback, capture} = record;

    // Remove any existing listener that matches the given arguments.
    for (let i = 0; i < this.#listeners.length; i++) {
      const existing = this.#listeners[i];
      if (callback === existing.callback && capture === existing.capture) {
        this.#listeners.splice(i, 1);
        break;
      }
    }
  }
}
