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

type Constructor<T> = new (...args: Array<any>) => T;

const nativeInsertBefore = Node.prototype.insertBefore;
const nativeGetParentNode =
    Object.getOwnPropertyDescriptor(Node.prototype, 'parentNode')?.get! ??
    // In Safari 9, the `parentNode` descriptor's `get` and `set` are undefined.
    function(this: Node) { return this.parentNode; };
const nativeGetNextSibling =
    Object.getOwnPropertyDescriptor(Node.prototype, 'nextSibling')?.get! ??
    // In Safari 9, the `nextSibling` descriptor's `get` and `set` are
    // undefined.
    function(this: Node) { return this.nextSibling; };

function installAfter<T>(constructor: Constructor<T>) {
  const prototype = constructor.prototype;
  if (prototype.hasOwnProperty('after')) {
    return;
  }

  Object.defineProperty(prototype, 'after', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function after(...args: Array<Node|string>) {
      const parentNode = nativeGetParentNode.call(this);
      if (parentNode === null) {
        return;
      }

      const nextSibling = nativeGetNextSibling.call(this);
      for (const arg of args) {
        nativeInsertBefore.call(
          parentNode,
          typeof arg === 'string' ? document.createTextNode(arg) : arg,
          nextSibling
        );
      }
    }
  });
}

installAfter(CharacterData);
installAfter(Element);
