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
import * as Utilities from '../Utilities.js';

import * as Native from './Native.js';

export default function(internals: CustomElementInternals) {
  // `Node#nodeValue` is implemented on `Attr`.
  // `Node#textContent` is implemented on `Attr`, `Element`.

  Node.prototype.insertBefore = function<T extends Node>(
      this: Node, node: T, refNode: Node|null) {
    if (node instanceof DocumentFragment) {
      const insertedNodes = Utilities.childrenFromFragment(node);
      const nativeResult = Native.Node_insertBefore.call(this, node, refNode);

      // DocumentFragments can't be connected, so `disconnectTree` will never
      // need to be called on a DocumentFragment's children after inserting it.

      if (Utilities.isConnected(this)) {
        for (let i = 0; i < insertedNodes.length; i++) {
          internals.connectTree(insertedNodes[i]);
        }
      }

      return nativeResult as T;
    }

    const nodeWasConnectedElement =
        node instanceof Element && Utilities.isConnected(node);
    const nativeResult =
        Native.Node_insertBefore.call(this, node, refNode) as T;

    if (nodeWasConnectedElement) {
      internals.disconnectTree(node);
    }

    if (Utilities.isConnected(this)) {
      internals.connectTree(node);
    }

    return nativeResult;
  };

  Node.prototype.appendChild = function<T extends Node>(this: Node, node: T) {
    if (node instanceof DocumentFragment) {
      const insertedNodes = Utilities.childrenFromFragment(node);
      const nativeResult = Native.Node_appendChild.call(this, node) as T;

      // DocumentFragments can't be connected, so `disconnectTree` will never
      // need to be called on a DocumentFragment's children after inserting it.

      if (Utilities.isConnected(this)) {
        for (let i = 0; i < insertedNodes.length; i++) {
          internals.connectTree(insertedNodes[i]);
        }
      }

      return nativeResult;
    }

    const nodeWasConnectedElement =
        node instanceof Element && Utilities.isConnected(node);
    const nativeResult = Native.Node_appendChild.call(this, node) as T;

    if (nodeWasConnectedElement) {
      internals.disconnectTree(node);
    }

    if (Utilities.isConnected(this)) {
      internals.connectTree(node);
    }

    return nativeResult;
  };

  Node.prototype.cloneNode = function(this: Node, deep) {
    const clone = Native.Node_cloneNode.call(this, !!deep);
    // Only create custom elements if this element's owner document is
    // associated with the registry.
    if (!this.ownerDocument!.__CE_registry) {
      internals.patchTree(clone);
    } else {
      internals.patchAndUpgradeTree(clone);
    }
    return clone;
  };

  Node.prototype.removeChild = function<T extends Node>(this: Node, node: T) {
    const nodeWasConnectedElement =
        node instanceof Element && Utilities.isConnected(node);
    const nativeResult = Native.Node_removeChild.call(this, node) as T;

    if (nodeWasConnectedElement) {
      internals.disconnectTree(node);
    }

    return nativeResult;
  };

  Node.prototype.replaceChild = function<T extends Node>(
      this: Node, nodeToInsert: Node, nodeToRemove: T) {
    if (nodeToInsert instanceof DocumentFragment) {
      const insertedNodes = Utilities.childrenFromFragment(nodeToInsert);
      const nativeResult =
          Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove) as T;

      // DocumentFragments can't be connected, so `disconnectTree` will never
      // need to be called on a DocumentFragment's children after inserting it.

      if (Utilities.isConnected(this)) {
        internals.disconnectTree(nodeToRemove);
        for (let i = 0; i < insertedNodes.length; i++) {
          internals.connectTree(insertedNodes[i]);
        }
      }

      return nativeResult;
    }

    const nodeToInsertWasConnectedElement =
        nodeToInsert instanceof Element && Utilities.isConnected(nodeToInsert);
    const nativeResult =
        Native.Node_replaceChild.call(this, nodeToInsert, nodeToRemove) as T;
    const thisIsConnected = Utilities.isConnected(this);

    if (thisIsConnected) {
      internals.disconnectTree(nodeToRemove);
    }

    if (nodeToInsertWasConnectedElement) {
      internals.disconnectTree(nodeToInsert);
    }

    if (thisIsConnected) {
      internals.connectTree(nodeToInsert);
    }

    return nativeResult;
  };


  function patch_textContent(
      destination: Node, baseDescriptor: PropertyDescriptor) {
    Object.defineProperty(destination, 'textContent', {
      enumerable: baseDescriptor.enumerable,
      configurable: true,
      get: baseDescriptor.get,
      set: function(this: Node, assignedValue) {
        // If this is a text node then there are no nodes to disconnect.
        if (this.nodeType === Node.TEXT_NODE) {
          baseDescriptor.set!.call(this, assignedValue);
          return;
        }

        let removedNodes = undefined;
        // Checking for `firstChild` is faster than reading `childNodes.length`
        // to compare with 0.
        if (this.firstChild) {
          // Using `childNodes` is faster than `children`, even though we only
          // care about elements.
          const childNodes = this.childNodes;
          const childNodesLength = childNodes.length;
          if (childNodesLength > 0 && Utilities.isConnected(this)) {
            // Copying an array by iterating is faster than using slice.
            removedNodes = new Array(childNodesLength);
            for (let i = 0; i < childNodesLength; i++) {
              removedNodes[i] = childNodes[i];
            }
          }
        }

        baseDescriptor.set!.call(this, assignedValue);

        if (removedNodes) {
          for (let i = 0; i < removedNodes.length; i++) {
            internals.disconnectTree(removedNodes[i]);
          }
        }
      },
    });
  }

  if (Native.Node_textContent && Native.Node_textContent.get) {
    patch_textContent(Node.prototype, Native.Node_textContent);
  } else {
    internals.addNodePatch(function(element) {
      patch_textContent(element, {
        enumerable: true,
        configurable: true,
        // NOTE: This implementation of the `textContent` getter assumes that
        // text nodes' `textContent` getter will not be patched.
        get: function(this: Node) {
          const parts: Array<string|null> = [];

          for (let n = this.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === Node.COMMENT_NODE) {
              continue;
            }
            parts.push(n.textContent);
          }

          return parts.join('');
        },
        set: function(this: Node, assignedValue) {
          while (this.firstChild) {
            Native.Node_removeChild.call(this, this.firstChild);
          }
          // `textContent = null | undefined | ''` does not result in
          // a TextNode childNode
          if (assignedValue != null && assignedValue !== '') {
            Native.Node_appendChild.call(
                this, document.createTextNode(assignedValue));
          }
        },
      });
    });
  }
}
