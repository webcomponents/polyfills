/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as utils from './utils.js';

class AsyncObserver {

  constructor() {
    this._scheduled = false;
    this.addedNodes = [];
    this.removedNodes = [];
    this.callbacks = new Set();
  }

  schedule() {
    if (!this._scheduled) {
      this._scheduled = true;
      utils.microtask(() => {
        this.flush();
      });
    }
  }

  flush() {
    if (this._scheduled) {
      this._scheduled = false;
      let mutations = this.takeRecords();
      if (mutations.length) {
        this.callbacks.forEach(function(cb) {
          cb(mutations);
        });
      }
    }
  }

  takeRecords() {
    if (this.addedNodes.length || this.removedNodes.length) {
      let mutations = [{
        addedNodes: this.addedNodes,
        removedNodes: this.removedNodes
      }];
      this.addedNodes = [];
      this.removedNodes = [];
      return mutations;
    }
    return [];
  }

}

// TODO(sorvell): consider instead polyfilling MutationObserver
// directly so that users do not have to fork their code.
// Supporting the entire api may be challenging: e.g. filtering out
// removed nodes in the wrong scope and seeing non-distributing
// subtree child mutations.
export let observeChildren = function(node, callback) {
  node.__shady = node.__shady || {};
  if (!node.__shady.observer) {
    node.__shady.observer = new AsyncObserver();
  }
  node.__shady.observer.callbacks.add(callback);
  let observer = node.__shady.observer;
  return {
    _callback: callback,
    _observer: observer,
    _node: node,
    takeRecords() {
      return observer.takeRecords()
    }
  };
}

export let unobserveChildren = function(handle) {
  let observer = handle && handle._observer;
  if (observer) {
    observer.callbacks.delete(handle._callback);
    if (!observer.callbacks.size) {
      handle._node.__shady.observer = null;
    }
  }
}

export function filterMutations(mutations, target) {
  /** @const {Node} */
  const targetRootNode = target.getRootNode();
  return mutations.map(function(mutation) {
    /** @const {boolean} */
    const mutationInScope = (targetRootNode === mutation.target.getRootNode());
    if (mutationInScope && mutation.addedNodes) {
      let nodes = Array.from(mutation.addedNodes).filter(function(n) {
        return (targetRootNode === n.getRootNode());
      });
      if (nodes.length) {
        mutation = Object.create(mutation);
        Object.defineProperty(mutation, 'addedNodes', {
          value: nodes,
          configurable: true
        });
        return mutation;
      }
    } else if (mutationInScope) {
      return mutation;
    }
  }).filter(function(m) { return m});
}
