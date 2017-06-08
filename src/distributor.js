/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {removeChild, dispatchEvent} from './native-methods.js';
import {parentNode} from './native-tree.js';

// NOTE: normalize event contruction where necessary (IE11)
let NormalizedEvent = typeof Event === 'function' ? Event :
  function(inType, params) {
    params = params || {};
    var e = document.createEvent('Event');
    e.initEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable));
    return e;
  };

export default class {

  constructor(root) {
    this.root = root;
    this.insertionPointTag = 'slot';
  }

  getInsertionPoints() {
    return this.root.querySelectorAll(this.insertionPointTag);
  }

  isInsertionPoint(node) {
    return node.localName && node.localName == this.insertionPointTag;
  }

  distribute() {
    if (this.root.hasInsertionPoint()) {
      return this.distributePool(this.root, this.collectPool());
    }
    return [];
  }

  // Gather the pool of nodes that should be distributed. We will combine
  // these with the "content root" to arrive at the composed tree.
  collectPool() {
    let host = this.root.host;
    let pool=[], i=0;
    for (let n=host.firstChild; n; n=n.nextSibling) {
      pool[i++] = n;
    }
    return pool;
  }

  // perform "logical" distribution; note, no actual dom is moved here,
  // instead elements are distributed into storage
  // array where applicable.
  distributePool(node, pool) {
    let dirtyRoots = [];
    let p$ = this.root._getInsertionPoints();
    for (let i=0, l=p$.length, p; (i<l) && (p=p$[i]); i++) {
      this.distributeInsertionPoint(p, pool);
      // provoke redistribution on insertion point parents
      // must do this on all candidate hosts since distribution in this
      // scope invalidates their distribution.
      // only get logical parent.
      let parent = p.parentNode;
      let root = parent && parent.__shady && parent.__shady.root
      if (root && root.hasInsertionPoint()) {
        dirtyRoots.push(root);
      }
    }
    for (let i=0; i < pool.length; i++) {
      let p = pool[i];
      if (p) {
        p.__shady = p.__shady || {};
        p.__shady.assignedSlot = undefined;
        // remove undistributed elements from physical dom.
        let parent = parentNode(p);
        if (parent) {
          removeChild.call(parent, p);
        }
      }
    }
    return dirtyRoots;
  }

  distributeInsertionPoint(insertionPoint, pool) {
    let prevAssignedNodes = insertionPoint.__shady.assignedNodes;
    if (prevAssignedNodes) {
      this.clearAssignedSlots(insertionPoint, true);
    }
    insertionPoint.__shady.assignedNodes = [];
    let needsSlotChange = false;
    // distribute nodes from the pool that this selector matches
    let anyDistributed = false;
    for (let i=0, l=pool.length, node; i < l; i++) {
      node=pool[i];
      // skip nodes that were already used
      if (!node) {
        continue;
      }
      // distribute this node if it matches
      if (this.matchesInsertionPoint(node, insertionPoint)) {
        if (node.__shady._prevAssignedSlot != insertionPoint) {
          needsSlotChange = true;
        }
        this.distributeNodeInto(node, insertionPoint)
        // remove this node from the pool
        pool[i] = undefined;
        // since at least one node matched, we won't need fallback content
        anyDistributed = true;
      }
    }
    // Fallback content if nothing was distributed here
    if (!anyDistributed) {
      let children = insertionPoint.childNodes;
      for (let j = 0, node; j < children.length; j++) {
        node = children[j];
        if (node.__shady._prevAssignedSlot != insertionPoint) {
          needsSlotChange = true;
        }
        this.distributeNodeInto(node, insertionPoint);
      }
    }
    // we're already dirty if a node was newly added to the slot
    // and we're also dirty if the assigned count decreased.
    if (prevAssignedNodes) {
      // TODO(sorvell): the tracking of previously assigned slots
      // could instead by done with a Set and then we could
      // avoid needing to iterate here to clear the info.
      for (let i=0; i < prevAssignedNodes.length; i++) {
        prevAssignedNodes[i].__shady._prevAssignedSlot = null;
      }
      if (insertionPoint.__shady.assignedNodes.length < prevAssignedNodes.length) {
        needsSlotChange = true;
      }
    }
    this.setDistributedNodesOnInsertionPoint(insertionPoint);
    if (needsSlotChange) {
      this._fireSlotChange(insertionPoint);
    }
  }

  clearAssignedSlots(slot, savePrevious) {
    let n$ = slot.__shady.assignedNodes;
    if (n$) {
      for (let i=0; i < n$.length; i++) {
        let n = n$[i];
        if (savePrevious) {
          n.__shady._prevAssignedSlot = n.__shady.assignedSlot;
        }
        // only clear if it was previously set to this slot;
        // this helps ensure that if the node has otherwise been distributed
        // ignore it.
        if (n.__shady.assignedSlot === slot) {
          n.__shady.assignedSlot = null;
        }
      }
    }
  }

  matchesInsertionPoint(node, insertionPoint) {
    let slotName = insertionPoint.getAttribute('name');
    slotName = slotName ? slotName.trim() : '';
    let slot = node.getAttribute && node.getAttribute('slot');
    slot = slot ? slot.trim() : '';
    return (slot == slotName);
  }

  distributeNodeInto(child, insertionPoint) {
    insertionPoint.__shady.assignedNodes.push(child);
    child.__shady.assignedSlot = insertionPoint;
  }

  setDistributedNodesOnInsertionPoint(insertionPoint) {
    let n$ = insertionPoint.__shady.assignedNodes;
    insertionPoint.__shady.distributedNodes = [];
    for (let i=0, n; (i<n$.length) && (n=n$[i]) ; i++) {
      if (this.isInsertionPoint(n)) {
        let d$ = n.__shady.distributedNodes;
        if (d$) {
          for (let j=0; j < d$.length; j++) {
            insertionPoint.__shady.distributedNodes.push(d$[j]);
          }
        }
      } else {
        insertionPoint.__shady.distributedNodes.push(n$[i]);
      }
    }
  }

  _fireSlotChange(insertionPoint) {
    // NOTE: cannot bubble correctly here so not setting bubbles: true
    // Safari tech preview does not bubble but chrome does
    // Spec says it bubbles (https://dom.spec.whatwg.org/#mutation-observers)
    dispatchEvent.call(insertionPoint, new NormalizedEvent('slotchange'));
    if (insertionPoint.__shady.assignedSlot) {
      this._fireSlotChange(insertionPoint.__shady.assignedSlot);
    }
  }

  isFinalDestination(insertionPoint) {
    return !(insertionPoint.__shady.assignedSlot);
  }

}
