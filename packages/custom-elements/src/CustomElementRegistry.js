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
import DocumentConstructionObserver from './DocumentConstructionObserver.js';
import Deferred from './Deferred.js';
import * as Utilities from './Utilities.js';

/**
 * @extends {window.CustomElementRegistry}
 */
export default class CustomElementRegistry {

  /**
   * @param {!CustomElementInternals} internals
   */
  constructor(internals) {
    /**
     * @private
     * @type {!Map<string, !CustomElementDefinition>}
     */
    this._localNameToDefinition = new Map();

    /**
     * @private
     * @type {!Map<!Function, !CustomElementDefinition>}
     */
    this._constructorToDefinition = new Map();

    /**
     * @private
     * @type {boolean}
     */
    this._elementDefinitionIsRunning = false;

    /**
     * @private
     * @type {!CustomElementInternals}
     */
    this._internals = internals;

    /**
     * @private
     * @type {!Map<string, !Deferred<undefined>>}
     */
    this._whenDefinedDeferred = new Map();

    /**
     * The default flush callback triggers the document walk synchronously.
     * @private
     * @type {!Function}
     */
    this._flushCallback = fn => fn();

    /**
     * @private
     * @type {boolean}
     */
    this._flushPending = false;

    /**
     * @private
     * @type {!Array<!CustomElementDefinition>}
     */
    this._pendingDefinitions = [];

    /**
    * @private
    * @const {!DocumentConstructionObserver|undefined}
    */
    this._documentConstructionObserver = internals.useDocumentConstructionObserver ?
      new DocumentConstructionObserver(internals, document) : undefined;
  }

  /**
   * @param {string} localName
   * @param {!Function} constructor
   */
  define(localName, constructor) {
    if (!(constructor instanceof Function)) {
      throw new TypeError('Custom element constructors must be functions.');
    }

    if (!Utilities.isValidCustomElementName(localName)) {
      throw new SyntaxError(`The element name '${localName}' is not valid.`);
    }

    if (this._localNameToDefinition.has(localName)) {
      throw new Error(`A custom element with name '${localName}' has already been defined.`);
    }

    if (this._elementDefinitionIsRunning) {
      throw new Error('A custom element is already being defined.');
    }
    this._elementDefinitionIsRunning = true;

    let connectedCallback;
    let disconnectedCallback;
    let adoptedCallback;
    let attributeChangedCallback;
    let observedAttributes;
    try {
      /** @type {!Object} */
      const prototype = constructor.prototype;
      if (!(prototype instanceof Object)) {
        throw new TypeError('The custom element constructor\'s prototype is not an object.');
      }

      function getCallback(name) {
        const callbackValue = prototype[name];
        if (callbackValue !== undefined && !(callbackValue instanceof Function)) {
          throw new Error(`The '${name}' callback must be a function.`);
        }
        return callbackValue;
      }

      connectedCallback = getCallback('connectedCallback');
      disconnectedCallback = getCallback('disconnectedCallback');
      adoptedCallback = getCallback('adoptedCallback');
      attributeChangedCallback = getCallback('attributeChangedCallback');
      // `observedAttributes` should not be read unless an
      // `attributesChangedCallback` exists
      observedAttributes = (attributeChangedCallback &&
        constructor['observedAttributes']) || [];
    } catch (e) {
      throw e;
    } finally {
      this._elementDefinitionIsRunning = false;
    }

    const definition = {
      localName,
      constructorFunction: constructor,
      connectedCallback,
      disconnectedCallback,
      adoptedCallback,
      attributeChangedCallback,
      observedAttributes,
      constructionStack: [],
    };

    this._localNameToDefinition.set(localName, definition);
    this._constructorToDefinition.set(definition.constructorFunction, definition);
    this._pendingDefinitions.push(definition);

    // If we've already called the flush callback and it hasn't called back yet,
    // don't call it again.
    if (!this._flushPending) {
      this._flushPending = true;
      this._flushCallback(() => this._flush());
    }
  }

  upgrade(element) {
    this._internals.patchAndUpgradeTree(element);
  }

  _flush() {
    // If no new definitions were defined, don't attempt to flush. This could
    // happen if a flush callback keeps the function it is given and calls it
    // multiple times.
    if (this._flushPending === false) return;
    this._flushPending = false;

    const pendingDefinitions = this._pendingDefinitions;

    /**
     * Unupgraded elements with definitions that were defined *before* the last
     * flush, in document order.
     * @type {!Array<!HTMLElement>}
     */
    const elementsWithStableDefinitions = [];

    /**
     * A map from `localName`s of definitions that were defined *after* the last
     * flush to unupgraded elements matching that definition, in document order.
     * @type {!Map<string, !Array<!HTMLElement>>}
     */
    const elementsWithPendingDefinitions = new Map();
    for (let i = 0; i < pendingDefinitions.length; i++) {
      elementsWithPendingDefinitions.set(pendingDefinitions[i].localName, []);
    }

    this._internals.patchAndUpgradeTree(document, {
      upgrade: element => {
        // Ignore the element if it has already upgraded or failed to upgrade.
        if (element.__CE_state !== undefined) return;

        const localName = element.localName;

        // If there is an applicable pending definition for the element, add the
        // element to the list of elements to be upgraded with that definition.
        const pendingElements = elementsWithPendingDefinitions.get(localName);
        if (pendingElements) {
          pendingElements.push(element);
        // If there is *any other* applicable definition for the element, add it
        // to the list of elements with stable definitions that need to be upgraded.
        } else if (this._localNameToDefinition.has(localName)) {
          elementsWithStableDefinitions.push(element);
        }
      },
    });

    // Upgrade elements with 'stable' definitions first.
    for (let i = 0; i < elementsWithStableDefinitions.length; i++) {
      this._internals.upgradeReaction(elementsWithStableDefinitions[i]);
    }

    // Upgrade elements with 'pending' definitions in the order they were defined.
    while (pendingDefinitions.length > 0) {
      const definition = pendingDefinitions.shift();
      const localName = definition.localName;

      // Attempt to upgrade all applicable elements.
      const pendingUpgradableElements = elementsWithPendingDefinitions.get(definition.localName);
      for (let i = 0; i < pendingUpgradableElements.length; i++) {
        this._internals.upgradeReaction(pendingUpgradableElements[i]);
      }

      // Resolve any promises created by `whenDefined` for the definition.
      const deferred = this._whenDefinedDeferred.get(localName);
      if (deferred) {
        deferred.resolve(undefined);
      }
    }
  }

  /**
   * @param {string} localName
   * @return {function(new: HTMLElement)|undefined}
   */
  get(localName) {
    const definition = this._localNameToDefinition.get(localName);
    if (definition) {
      return definition.constructorFunction;
    }

    return undefined;
  }

  /**
   * @param {string} localName
   * @return {!Promise<undefined>}
   */
  whenDefined(localName) {
    if (!Utilities.isValidCustomElementName(localName)) {
      return Promise.reject(new SyntaxError(`'${localName}' is not a valid custom element name.`));
    }

    const prior = this._whenDefinedDeferred.get(localName);
    if (prior) {
      return prior.toPromise();
    }

    const deferred = new Deferred();
    this._whenDefinedDeferred.set(localName, deferred);

    const definition = this._localNameToDefinition.get(localName);
    // Resolve immediately only if the given local name has a definition *and*
    // the full document walk to upgrade elements with that local name has
    // already happened.
    if (definition && !this._pendingDefinitions.some(d => d.localName === localName)) {
      deferred.resolve(undefined);
    }

    return deferred.toPromise();
  }

  polyfillWrapFlushCallback(outer) {
    if (this._documentConstructionObserver) {
      this._documentConstructionObserver.disconnect();
    }
    const inner = this._flushCallback;
    this._flushCallback = flush => outer(() => inner(flush));
  }

  /**
   * @param {string} localName
   * @return {!CustomElementDefinition|undefined}
   */
  internal_localNameToDefinition(localName) {
    return this._localNameToDefinition.get(localName);
  }

  /**
   * @param {!Function} constructor
   * @return {!CustomElementDefinition|undefined}
   */
  internal_constructorToDefinition(constructor) {
    return this._constructorToDefinition.get(constructor);
  }
}

// Closure compiler exports.
window['CustomElementRegistry'] = CustomElementRegistry;
CustomElementRegistry.prototype['define'] = CustomElementRegistry.prototype.define;
CustomElementRegistry.prototype['upgrade'] = CustomElementRegistry.prototype.upgrade;
CustomElementRegistry.prototype['get'] = CustomElementRegistry.prototype.get;
CustomElementRegistry.prototype['whenDefined'] = CustomElementRegistry.prototype.whenDefined;
CustomElementRegistry.prototype['polyfillWrapFlushCallback'] = CustomElementRegistry.prototype.polyfillWrapFlushCallback;
