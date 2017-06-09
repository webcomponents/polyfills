import * as EnvProxy from './EnvironmentProxy.js';
import CustomElementInternals from './CustomElementInternals.js';

export default class DocumentConstructionObserver {
  constructor(internals, doc) {
    /**
     * @type {!CustomElementInternals}
     */
    this._internals = internals;

    /**
     * @type {!Document}
     */
    this._document = doc;

    /**
     * @type {MutationObserver|undefined}
     */
    this._observer = undefined;


    // Simulate tree construction for all currently accessible nodes in the
    // document.
    this._internals.patchAndUpgradeTree(this._document);

    if (EnvProxy.readyState(this._document) === 'loading') {
      this._observer = new EnvProxy.MutationObserver(this._handleMutations.bind(this));

      // Nodes created by the parser are given to the observer *before* the next
      // task runs. Inline scripts are run in a new task. This means that the
      // observer will be able to handle the newly parsed nodes before the inline
      // script is run.
      EnvProxy.observe(this._observer, this._document, {
        childList: true,
        subtree: true,
      });
    }
  }

  disconnect() {
    if (this._observer) {
      EnvProxy.disconnect(this._observer);
    }
  }

  /**
   * @param {!Array<!MutationRecord>} mutations
   */
  _handleMutations(mutations) {
    // Once the document's `readyState` is 'interactive' or 'complete', all new
    // nodes created within that document will be the result of script and
    // should be handled by patching.
    const readyState = EnvProxy.readyState(this._document);
    if (readyState === 'interactive' || readyState === 'complete') {
      this.disconnect();
    }

    for (let i = 0; i < mutations.length; i++) {
      const addedNodes = EnvProxy.addedNodes(mutations[i]);
      for (let j = 0; j < addedNodes.length; j++) {
        const node = addedNodes[j];
        this._internals.patchAndUpgradeTree(node);
      }
    }
  }
}
