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

import CustomElementInternals from '../../CustomElementInternals.js';
import * as Utilities from '../../Utilities.js';

type NativeMethod = (this: ChildNode, ...args: Array<Node|string>) => void;

interface ChildNodeNativeMethods {
  before: NativeMethod;
  after: NativeMethod;
  replaceWith: NativeMethod;
  remove: (this: ChildNode) => void;
}

export default function(
    internals: CustomElementInternals,
    destination: ChildNode,
    builtIn: ChildNodeNativeMethods) {
  function beforeAfterPatch(builtInMethod: NativeMethod): NativeMethod {
    return function(this: ChildNode, ...nodes) {
      const flattenedNodes: Array<string|Node> = [];
      const connectedElements: Array<Node> = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node instanceof Element && Utilities.isConnected(node)) {
          connectedElements.push(node);
        }

        if (node instanceof DocumentFragment) {
          for (let child = node.firstChild; child; child = child.nextSibling) {
            flattenedNodes.push(child);
          }
        } else {
          flattenedNodes.push(node);
        }
      }

      builtInMethod.apply(this, nodes);

      for (let i = 0; i < connectedElements.length; i++) {
        internals.disconnectTree(connectedElements[i]);
      }

      if (Utilities.isConnected(this)) {
        for (let i = 0; i < flattenedNodes.length; i++) {
          const node = flattenedNodes[i];
          if (node instanceof Element) {
            internals.connectTree(node);
          }
        }
      }
    };
  }

  if (builtIn.before !== undefined) {
    destination.before = beforeAfterPatch(builtIn.before);
  }

  if (builtIn.after !== undefined) {
    destination.after = beforeAfterPatch(builtIn.after);
  }

  if (builtIn.replaceWith !== undefined) {
    destination.replaceWith = function(
        this: ChildNode, ...nodes: Array<Node|string>) {
      /**
       * A copy of `nodes`, with any DocumentFragment replaced by its children.
       */
      const flattenedNodes: Array<Node|string> = [];

      /**
       * Elements in `nodes` that were connected before this call.
       */
      const connectedElements: Array<Node> = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node instanceof Element && Utilities.isConnected(node)) {
          connectedElements.push(node);
        }

        if (node instanceof DocumentFragment) {
          for (let child = node.firstChild; child; child = child.nextSibling) {
            flattenedNodes.push(child);
          }
        } else {
          flattenedNodes.push(node);
        }
      }

      const wasConnected = Utilities.isConnected(this);

      builtIn.replaceWith.apply(this, nodes);

      for (let i = 0; i < connectedElements.length; i++) {
        internals.disconnectTree(connectedElements[i]);
      }

      if (wasConnected) {
        internals.disconnectTree(this);
        for (let i = 0; i < flattenedNodes.length; i++) {
          const node = flattenedNodes[i];
          if (node instanceof Element) {
            internals.connectTree(node);
          }
        }
      }
    };
  }

  if (builtIn.remove !== undefined) {
    destination.remove = function(this: ChildNode) {
      const wasConnected = Utilities.isConnected(this);

      builtIn.remove.call(this);

      if (wasConnected) {
        internals.disconnectTree(this);
      }
    };
  }
}
