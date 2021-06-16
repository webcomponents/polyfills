/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from '../utils.js';
// prettier-ignore
import {getScopingShim, removeShadyScoping, replaceShadyScoping, treeVisitor, currentScopeForNode, currentScopeIsCorrect} from '../style-scoping.js';
import {shadyDataForNode, ensureShadyDataForNode} from '../shady-data.js';
import {recordInsertBefore, recordRemoveChild} from '../link-nodes.js';
import {ownerShadyRootForNode} from '../attach-shadow.js';

const doc = window.document;

const preferPerformance = utils.settings.preferPerformance;

const nativeIsConnectedAccessors = /** @type {ObjectPropertyDescriptor} */ (Object.getOwnPropertyDescriptor(
  Node.prototype,
  'isConnected'
));

const nativeIsConnected =
  nativeIsConnectedAccessors && nativeIsConnectedAccessors.get;

export function clearNode(node) {
  let firstChild;
  while ((firstChild = node[utils.SHADY_PREFIX + 'firstChild'])) {
    node[utils.SHADY_PREFIX + 'removeChild'](firstChild);
  }
}

function removeOwnerShadyRoot(node) {
  // optimization: only reset the tree if node is actually in a root
  if (hasCachedOwnerRoot(node)) {
    for (
      let n = node[utils.SHADY_PREFIX + 'firstChild'];
      n;
      n = n[utils.SHADY_PREFIX + 'nextSibling']
    ) {
      removeOwnerShadyRoot(n);
    }
  }
  const nodeData = shadyDataForNode(node);
  if (nodeData) {
    nodeData.ownerShadyRoot = undefined;
  }
}

function hasCachedOwnerRoot(node) {
  const nodeData = shadyDataForNode(node);
  return Boolean(nodeData && nodeData.ownerShadyRoot !== undefined);
}

/**
 * Finds the first flattened node that is composed in the node's parent.
 * If the given node is a slot, then the first flattened node is returned
 * if it exists, otherwise advance to the node's nextSibling.
 * @param {Node} node within which to find first composed node
 * @returns {Node} first composed node
 */
function firstComposedNode(node) {
  let composed = node;
  if (node && node.localName === 'slot') {
    const nodeData = shadyDataForNode(node);
    const flattened = nodeData && nodeData.flattenedNodes;
    // Note, if `flattened` is falsey, it means that the containing shadowRoot
    // has not rendered and therefore the `<slot>` is still in the composed
    // DOM. If that's the case the `<slot>` is the first composed node.
    if (flattened) {
      composed = flattened.length
        ? flattened[0]
        : firstComposedNode(node[utils.SHADY_PREFIX + 'nextSibling']);
    }
  }
  return composed;
}

/**
 * @param {Node} node
 * @param {Node=} addedNode
 * @param {Node=} removedNode
 */
function scheduleObserver(node, addedNode, removedNode) {
  const nodeData = shadyDataForNode(node);
  const observer = nodeData && nodeData.observer;
  if (observer) {
    if (addedNode) {
      if (addedNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        for (let i = 0, l = addedNode.childNodes.length; i < l; i++) {
          observer.addedNodes.push(addedNode.childNodes[i]);
        }
      } else {
        observer.addedNodes.push(addedNode);
      }
    }
    if (removedNode) {
      observer.removedNodes.push(removedNode);
    }
    observer.schedule();
  }
}

export const NodePatches = utils.getOwnPropertyDescriptors({
  /** @this {Node} */
  get parentNode() {
    const nodeData = shadyDataForNode(this);
    const l = nodeData && nodeData.parentNode;
    return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'parentNode'];
  },

  /** @this {Node} */
  get firstChild() {
    const nodeData = shadyDataForNode(this);
    const l = nodeData && nodeData.firstChild;
    return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'firstChild'];
  },

  /** @this {Node} */
  get lastChild() {
    const nodeData = shadyDataForNode(this);
    const l = nodeData && nodeData.lastChild;
    return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'lastChild'];
  },

  /** @this {Node} */
  get nextSibling() {
    const nodeData = shadyDataForNode(this);
    const l = nodeData && nodeData.nextSibling;
    return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'nextSibling'];
  },

  /** @this {Node} */
  get previousSibling() {
    const nodeData = shadyDataForNode(this);
    const l = nodeData && nodeData.previousSibling;
    return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'previousSibling'];
  },

  /** @this {Node} */
  get childNodes() {
    let childNodes;
    if (utils.isTrackingLogicalChildNodes(this)) {
      const nodeData = shadyDataForNode(this);
      if (!nodeData.childNodes) {
        nodeData.childNodes = [];
        for (
          let n = this[utils.SHADY_PREFIX + 'firstChild'];
          n;
          n = n[utils.SHADY_PREFIX + 'nextSibling']
        ) {
          nodeData.childNodes.push(n);
        }
      }
      childNodes = nodeData.childNodes;
    } else {
      childNodes = this[utils.NATIVE_PREFIX + 'childNodes'];
    }
    childNodes.item = function (index) {
      return childNodes[index];
    };
    return childNodes;
  },

  /** @this {Node} */
  get parentElement() {
    const nodeData = shadyDataForNode(this);
    let l = nodeData && nodeData.parentNode;
    if (l && l.nodeType !== Node.ELEMENT_NODE) {
      l = null;
    }
    return l !== undefined ? l : this[utils.NATIVE_PREFIX + 'parentElement'];
  },

  /** @this {Node} */
  get isConnected() {
    if (nativeIsConnected && nativeIsConnected.call(this)) {
      return true;
    }
    if (this.nodeType == Node.DOCUMENT_FRAGMENT_NODE) {
      return false;
    }
    // Fast path for distributed nodes.
    const ownerDocument = this.ownerDocument;
    if (ownerDocument === null || utils.documentContains(ownerDocument, this)) {
      return true;
    }
    // Slow path for non-distributed nodes.
    let node = this;
    while (node && !(node instanceof Document)) {
      node =
        node[utils.SHADY_PREFIX + 'parentNode'] ||
        (utils.isShadyRoot(node)
          ? /** @type {ShadowRoot} */ (node).host
          : undefined);
    }
    return !!(node && node instanceof Document);
  },

  /** @this {Node} */
  get textContent() {
    if (utils.isTrackingLogicalChildNodes(this)) {
      let tc = [];
      for (
        let n = this[utils.SHADY_PREFIX + 'firstChild'];
        n;
        n = n[utils.SHADY_PREFIX + 'nextSibling']
      ) {
        if (n.nodeType !== Node.COMMENT_NODE) {
          tc.push(n[utils.SHADY_PREFIX + 'textContent']);
        }
      }
      return tc.join('');
    } else {
      return this[utils.NATIVE_PREFIX + 'textContent'];
    }
  },

  /**
   * @this {Node}
   * @param {string} value
   */
  set textContent(value) {
    if (typeof value === 'undefined' || value === null) {
      value = '';
    }
    switch (this.nodeType) {
      case Node.ELEMENT_NODE:
      case Node.DOCUMENT_FRAGMENT_NODE:
        if (
          !utils.isTrackingLogicalChildNodes(this) &&
          utils.settings.hasDescriptors
        ) {
          // may be removing a nested slot but fast path if we know we are not.
          const firstChild = this[utils.SHADY_PREFIX + 'firstChild'];
          if (
            firstChild != this[utils.SHADY_PREFIX + 'lastChild'] ||
            (firstChild && firstChild.nodeType != Node.TEXT_NODE)
          ) {
            clearNode(this);
          }
          this[utils.NATIVE_PREFIX + 'textContent'] = value;
        } else {
          clearNode(this);
          // Document fragments must have no childNodes if setting a blank string
          if (value.length > 0 || this.nodeType === Node.ELEMENT_NODE) {
            this[utils.SHADY_PREFIX + 'insertBefore'](
              document.createTextNode(value)
            );
          }
        }
        break;
      default:
        // Note, be wary of patching `nodeValue`.
        this.nodeValue = value;
        break;
    }
  },

  // Patched `insertBefore`. Note that all mutations that add nodes are routed
  // here. When a <slot> is added or a node is added to a host with a shadowRoot
  // with a slot, a standard dom `insert` call is aborted and `_asyncRender`
  // is called on the relevant shadowRoot. In all other cases, a standard dom
  // `insert` can be made, but the location and ref_node may need to be changed.
  /**
   * @this {Node}
   * @param {Node} node
   * @param {Node=} ref_node
   */
  insertBefore(node, ref_node) {
    // optimization: assume native insertBefore is ok if the nodes are not in the document.
    if (this.ownerDocument !== doc && node.ownerDocument !== doc) {
      this[utils.NATIVE_PREFIX + 'insertBefore'](node, ref_node);
      return node;
    }
    if (node === this) {
      throw Error(
        `Failed to execute 'appendChild' on 'Node': The new child element contains the parent.`
      );
    }
    if (ref_node) {
      const refData = shadyDataForNode(ref_node);
      const p = refData && refData.parentNode;
      if (
        (p !== undefined && p !== this) ||
        (p === undefined &&
          ref_node[utils.NATIVE_PREFIX + 'parentNode'] !== this)
      ) {
        throw Error(
          `Failed to execute 'insertBefore' on 'Node': The node ` +
            `before which the new node is to be inserted is not a child of this node.`
        );
      }
    }
    if (ref_node === node) {
      return node;
    }
    scheduleObserver(this, node);
    /** @type {!Array<!HTMLSlotElement>} */
    const slotsAdded = [];
    const ownerRoot = ownerShadyRootForNode(this);
    /** @type {string} */
    const newScopeName = ownerRoot
      ? ownerRoot.host.localName
      : currentScopeForNode(this);
    /** @type {string} */
    let oldScopeName;
    // remove from existing location
    const parentNode = node[utils.SHADY_PREFIX + 'parentNode'];
    if (parentNode) {
      oldScopeName = currentScopeForNode(node);
      const skipUnscoping =
        // Don't remove scoping if we're inserting into another shadowRoot;
        // this would be unnecessary since it will be re-scoped below
        Boolean(ownerRoot) ||
        // Don't remove scoping if we're being moved between non-shadowRoot
        // locations (the likely case is when moving pre-scoped nodes in a template)
        !ownerShadyRootForNode(node) ||
        // Under preferPerformance, don't remove scoping when moving back into
        // a document fragment that was previously scoped; the assumption is
        // that the user should only move correctly-scoped DOM back into it
        (preferPerformance && this['__noInsertionPoint'] !== undefined);
      parentNode[utils.SHADY_PREFIX + 'removeChild'](node, skipUnscoping);
    }
    // add to new parent
    let allowNativeInsert = true;
    const needsScoping =
      (!preferPerformance ||
        // Under preferPerformance, only re-scope if we're not coming from a
        // pre-scoped doc fragment or back into a pre-scoped doc fragment
        (node['__noInsertionPoint'] === undefined &&
          this['__noInsertionPoint'] === undefined)) &&
      !currentScopeIsCorrect(node, newScopeName);
    const needsSlotFinding =
      ownerRoot &&
      !node['__noInsertionPoint'] &&
      (!preferPerformance || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE);
    if (needsSlotFinding || needsScoping) {
      // NOTE: avoid node.removeChild as this *can* trigger another patched
      // method (e.g. custom elements) and we want only the shady method to run.
      // The following table describes what style scoping actions should happen as a result of this insertion.
      // document -> shadowRoot: replace
      // shadowRoot -> shadowRoot: replace
      // shadowRoot -> shadowRoot of same type: do nothing
      // shadowRoot -> document: allow unscoping
      // document -> document: do nothing
      // The "same type of shadowRoot" and "document to document cases rely on `currentScopeIsCorrect` returning true
      if (needsScoping) {
        // in a document or disconnected tree, replace scoping if necessary
        oldScopeName = oldScopeName || currentScopeForNode(node);
      }
      treeVisitor(node, (node) => {
        if (needsSlotFinding && node.localName === 'slot') {
          slotsAdded.push(/** @type {!HTMLSlotElement} */ (node));
        }
        if (needsScoping) {
          replaceShadyScoping(node, newScopeName, oldScopeName);
        }
      });
    }
    // if a slot is added, must render containing root.
    if (slotsAdded.length) {
      ownerRoot._addSlots(slotsAdded);
      ownerRoot._asyncRender();
    }
    if (utils.isTrackingLogicalChildNodes(this)) {
      recordInsertBefore(node, this, ref_node);
      const parentData = shadyDataForNode(this);
      // if the node being inserted into has a shadowRoot, do not perform
      // a native insertion
      if (parentData.root) {
        allowNativeInsert = false;
        // when inserting into a host with a shadowRoot with slot, use
        // `shadowRoot._asyncRender()` via `attach-shadow` module
        // when inserting into a host with shadowRoot with NO slot, do nothing
        // as the node should not be added to composed DOM anywhere.
        if (utils.hasShadowRootWithSlot(this)) {
          parentData.root._asyncRender();
        }
      }
      // when inserting into a slot inside a shadowRoot, render the
      // containing shadowRoot to update fallback content.
      else if (ownerRoot && this.localName === 'slot') {
        allowNativeInsert = false;
        ownerRoot._asyncRender();
      }
    }
    if (allowNativeInsert) {
      // if adding to a shadyRoot, add to host instead
      let container = utils.isShadyRoot(this)
        ? /** @type {ShadowRoot} */ (this).host
        : this;
      // if ref_node, get the ref_node that's actually in composed dom.
      if (ref_node) {
        ref_node = firstComposedNode(ref_node);
        container[utils.NATIVE_PREFIX + 'insertBefore'](node, ref_node);
      } else {
        container[utils.NATIVE_PREFIX + 'appendChild'](node);
      }
    }
    // Since ownerDocument is not patched, it can be incorrect after this call
    // if the node is physically appended via distribution. This can result
    // in the custom elements polyfill not upgrading the node if it's in an inert doc.
    // We correct this by calling `adoptNode`.
    else if (node.ownerDocument !== this.ownerDocument) {
      this.ownerDocument.adoptNode(node);
    }
    return node;
  },

  /**
   * @this {Node}
   * @param {Node} node
   */
  appendChild(node) {
    // if this is a shadowRoot and the shadowRoot is passed as `node`
    // then an optimized append has already been performed, so do nothing.
    if (!(this == node && utils.isShadyRoot(node))) {
      return this[utils.SHADY_PREFIX + 'insertBefore'](node);
    }
  },

  /**
   * Patched `removeChild`. Note that all dom "removals" are routed here.
   * Removes the given `node` from the element's `children`.
   * This method also performs dom composition.
   * @this {Node}
   * @param {Node} node
   * @param {boolean=} skipUnscoping
   */
  removeChild(node, skipUnscoping = false) {
    if (this.ownerDocument !== doc) {
      return this[utils.NATIVE_PREFIX + 'removeChild'](node);
    }
    if (node[utils.SHADY_PREFIX + 'parentNode'] !== this) {
      throw Error(
        'The node to be removed is not a child of this node: ' + node
      );
    }
    scheduleObserver(this, null, node);
    let preventNativeRemove;
    let ownerRoot = ownerShadyRootForNode(node);
    const removingInsertionPoint =
      ownerRoot && ownerRoot._removeContainedSlots(node);
    const parentData = shadyDataForNode(this);
    if (utils.isTrackingLogicalChildNodes(this)) {
      recordRemoveChild(node, this);
      if (utils.hasShadowRootWithSlot(this)) {
        parentData.root._asyncRender();
        preventNativeRemove = true;
      }
    }
    // unscope a node leaving a ShadowRoot if ShadyCSS is present, and this node
    // is not going to be rescoped in `insertBefore`
    if (
      getScopingShim() &&
      !skipUnscoping &&
      ownerRoot &&
      node.nodeType !== Node.TEXT_NODE
    ) {
      const oldScopeName = currentScopeForNode(node);
      treeVisitor(node, (node) => {
        removeShadyScoping(node, oldScopeName);
      });
    }
    removeOwnerShadyRoot(node);
    // if removing slot, must render containing root
    if (ownerRoot) {
      let changeSlotContent = this.localName === 'slot';
      if (changeSlotContent) {
        preventNativeRemove = true;
      }
      if (removingInsertionPoint || changeSlotContent) {
        ownerRoot._asyncRender();
      }
    }
    if (!preventNativeRemove) {
      // if removing from a shadyRoot, remove from host instead
      let container = utils.isShadyRoot(this)
        ? /** @type {ShadowRoot} */ (this).host
        : this;
      // not guaranteed to physically be in container; e.g.
      // (1) if parent has a shadyRoot, element may or may not at distributed
      // location (could be undistributed)
      // (2) if parent is a slot, element may not ben in composed dom
      if (
        !(parentData.root || node.localName === 'slot') ||
        container === node[utils.NATIVE_PREFIX + 'parentNode']
      ) {
        container[utils.NATIVE_PREFIX + 'removeChild'](node);
      }
    }
    return node;
  },

  /**
   * @this {Node}
   * @param {Node} node
   * @param {Node=} ref_node
   */
  replaceChild(node, ref_node) {
    this[utils.SHADY_PREFIX + 'insertBefore'](node, ref_node);
    this[utils.SHADY_PREFIX + 'removeChild'](ref_node);
    return node;
  },

  /**
   * @this {Node}
   * @param {boolean=} deep
   */
  cloneNode(deep) {
    if (this.localName == 'template') {
      return this[utils.NATIVE_PREFIX + 'cloneNode'](deep);
    } else {
      const n = this[utils.NATIVE_PREFIX + 'cloneNode'](false);
      // Attribute nodes historically had childNodes, but they have later
      // been removed from the spec.
      // Make sure we do not do a deep clone on them for old browsers (IE11)
      if (deep && n.nodeType !== Node.ATTRIBUTE_NODE) {
        for (
          let c = this[utils.SHADY_PREFIX + 'firstChild'], nc;
          c;
          c = c[utils.SHADY_PREFIX + 'nextSibling']
        ) {
          nc = c[utils.SHADY_PREFIX + 'cloneNode'](true);
          n[utils.SHADY_PREFIX + 'appendChild'](nc);
        }
      }
      return n;
    }
  },

  /**
   * @this {Node}
   * @param {Object=} options
   */
  // TODO(sorvell): implement `options` e.g. `{ composed: boolean }`
  getRootNode(options) {
    if (!this || !this.nodeType) {
      return;
    }
    const nodeData = ensureShadyDataForNode(this);
    let root = nodeData.ownerShadyRoot;
    if (root === undefined) {
      if (utils.isShadyRoot(this)) {
        root = this;
        nodeData.ownerShadyRoot = root;
      } else {
        let parent = this[utils.SHADY_PREFIX + 'parentNode'];
        root = parent
          ? parent[utils.SHADY_PREFIX + 'getRootNode'](options)
          : this;
        // memo-ize result for performance but only memo-ize
        // result if node is in the document. This avoids a problem where a root
        // can be cached while an element is inside a fragment.
        // If this happens and we cache the result, the value can become stale
        // because for perf we avoid processing the subtree of added fragments.
        if (document.documentElement[utils.NATIVE_PREFIX + 'contains'](this)) {
          nodeData.ownerShadyRoot = root;
        }
      }
    }
    return root;
  },

  /** @this {Node} */
  contains(node) {
    return utils.contains(this, node);
  },
});
