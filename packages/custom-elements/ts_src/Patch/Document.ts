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

import CustomElementInternals from '../CustomElementInternals.js';

import PatchParentNode from './Interface/ParentNode.js';
import * as Native from './Native.js';

export default function(internals: CustomElementInternals) {
  Document.prototype.createElement = function(
                                         this: Document, localName: string) {
    return internals.createAnElement(this, localName, null);
  } as typeof Document.prototype.createElement;

  Document.prototype.importNode = function<T extends Node>(
      this: Document, node: T, deep?: boolean): T {
    const clone = Native.Document_importNode.call(this, node, !!deep) as T;
    // Only create custom elements if this document is associated with the
    // registry.
    if (!this.__CE_registry) {
      internals.patchTree(clone);
    } else {
      internals.patchAndUpgradeTree(clone);
    }
    return clone;
  };

  Document.prototype.createElementNS =
      function(this: Document, namespace: string|null, localName: string) {
    return internals.createAnElement(this, localName, namespace);
  } as typeof Document.prototype.createElementNS;

  PatchParentNode(internals, Document.prototype, {
    prepend: Native.Document_prepend,
    append: Native.Document_append,
  });
}
