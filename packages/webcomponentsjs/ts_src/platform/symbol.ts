/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/

// import polyfill for Symbol and Object.getOwnPropertySymbols
import 'get-own-property-symbols/build/get-own-property-symbols.max';

// Fix issue in toString patch when compiled into strict mode via closure
// https://github.com/es-shims/get-own-property-symbols/issues/16
const toString = Object.prototype.toString;
Object.prototype.toString = function() {
  if (this === undefined) {
    return '[object Undefined]';
  } else if (this === null) {
    return '[object Null]';
  } else {
    return toString.call(this);
  }
};

// overwrite Object.keys to filter out symbols
Object.keys = function(obj: object) {
  return Object.getOwnPropertyNames(obj).filter((name) => {
    const prop = Object.getOwnPropertyDescriptor(obj, name);
    return prop && prop.enumerable;
  });
};

// implement iterators for IE 11
if (!String.prototype[Symbol.iterator] || !String.prototype.codePointAt) {
  String.prototype[Symbol.iterator] = function*(this: string) {
    for (let i = 0; i < this.length; i++) {
      yield this[i];
    }
  }
}

if (!Set.prototype[Symbol.iterator]) {
  Set.prototype[Symbol.iterator] = function*<T>(this: Set<T>) {
    const temp: T[] = [];
    this.forEach((value) => {
      temp.push(value);
    });
    for (let i = 0; i < temp.length; i++) {
      yield temp[i];
    }
  };
}

if (!Map.prototype[Symbol.iterator]) {
  Map.prototype[Symbol.iterator] = function*<K, V>(this: Map<K, V>) {
    const entries: Array<[K, V]> = [];
    this.forEach((value, key) => {
      entries.push([key, value]);
    });
    for (let i = 0; i < entries.length; i++) {
      yield entries[i];
    }
  };
}
