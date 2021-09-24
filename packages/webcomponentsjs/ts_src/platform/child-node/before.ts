/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

export {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: Array<any>) => T;

const nativeInsertBefore = Node.prototype.insertBefore;
const nativeGetParentNode =
  Object.getOwnPropertyDescriptor(Node.prototype, 'parentNode')?.get ??
  // In Safari 9, the `parentNode` descriptor's `get` and `set` are undefined.
  function (this: Node) {
    return this.parentNode;
  };

const installBefore = <T>(constructor: Constructor<T>) => {
  const prototype = constructor.prototype;
  if (prototype.hasOwnProperty('before')) {
    return;
  }

  Object.defineProperty(prototype, 'before', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function before(...args: Array<Node | string>) {
      const parentNode = nativeGetParentNode.call(this);
      if (parentNode === null) {
        return;
      }

      for (const arg of args) {
        nativeInsertBefore.call(
          parentNode,
          typeof arg === 'string' ? document.createTextNode(arg) : arg,
          this
        );
      }
    },
  });
};

installBefore(CharacterData);
installBefore(Element);
