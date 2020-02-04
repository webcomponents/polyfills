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

export default class Deferred<T> {
  private _value: T|undefined = undefined;

  private _resolve!: (val: T) => void;

  private readonly _promise: Promise<T>;
  constructor() {
    this._promise = new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  resolve(value: T) {
    if (this._value) {
      throw new Error('Already resolved.');
    }

    this._value = value;
    this._resolve(value);
  }

  toPromise() {
    return this._promise;
  }
}
