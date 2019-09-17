/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import CustomElementInternals from './CustomElementInternals.js';

export default class DocumentConstructionObserver {
  constructor(internals, doc) {
    /**
     * @private
     * @type {!CustomElementInternals}
     */
    this._internals = internals;

    /**
     * @private
     * @type {!Document}
     */
    this._document = doc;

    /**
     * @private
     * @type {MutationObserver|undefined}
     */
    this._observer = undefined;

    /**
     * @private
     * @type {!Array<!Element|undefined>}
     */
    this._parserQueue = [];


    // Simulate tree construction for all currently accessible nodes in the
    // document.
    this._internals.patchAndUpgradeTree(this._document);

    if (this._document.readyState === 'loading') {
      this._observer = new MutationObserver(this._handleMutations.bind(this));

      // Nodes created by the parser are given to the observer *before* the next
      // task runs. Inline scripts are run in a new task. This means that the
      // observer will be able to handle the newly parsed nodes before the inline
      // script is run.
      this._observer.observe(this._document, {
        childList: true,
        subtree: true,
      });
    }
  }

  disconnect() {
    // Release references to any elements in the queue.
    this._parserQueue.length = 0;
    if (this._observer) {
      this._observer.disconnect();
    }
  }

  /**
   * @private
   * @param {!Array<!MutationRecord>} mutations
   */
  _handleMutations(mutations) {
    // Once the document's `readyState` is 'interactive' or 'complete', all new
    // nodes created within that document will be the result of script and
    // should be handled by patching.
    const readyState = this._document.readyState;
    if (readyState === 'interactive' || readyState === 'complete') {
      this.disconnect();
    }

    const internals = this._internals;
    const parserQueue = this._parserQueue;

    let addedElementsCount = 0;

    for (let i = 0, mutationsLength = mutations.length; i < mutationsLength; i++) {
      const addedNodes = mutations[i].addedNodes;
      for (let j = 0, addedNodesLength = addedNodes.length; j < addedNodesLength; j++) {
        const node = addedNodes[j];
        if (node instanceof Element) {
          internals.patchElement(node);
          parserQueue[addedElementsCount++] = node;
        }
      }
    }

    for (let i = 0; i < addedElementsCount; i++) {
      const element = /** @type {!Element} */ (parserQueue[i]);

      internals.pushCEReactionsQueue();
      internals.upgradeReaction(element);
      internals.popCEReactionsQueue();
    }
  }
}
