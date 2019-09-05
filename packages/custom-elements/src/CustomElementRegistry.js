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
     * @type {!Map<string, function(): function(new: HTMLElement)>}
     */
    this._localNameToConstructorGetter = new Map();

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
     * A map from `localName`s of definitions that were defined *after* the
     * last flush to unupgraded elements matching that definition, in document
     * order. Entries are added to this map when a definition is registered,
     * but the list of elements is only populated during a flush after which
     * all of the entries are removed. DO NOT edit outside of `#_flush`.
     * @private
     * @type {!Array<string>}
     */
    this._unflushedLocalNames = [];

    /**
    * @private
    * @const {!DocumentConstructionObserver|undefined}
    */
    this._documentConstructionObserver = internals.useDocumentConstructionObserver ?
      new DocumentConstructionObserver(internals, document) : undefined;
  }

  /**
   * @param {string} localName
   * @param {function(): function(new: HTMLElement)} constructorGetter
   */
  polyfillDefineLazy(localName, constructorGetter) {
    if (!(constructorGetter instanceof Function)) {
      throw new TypeError('Custom element constructor getters must be functions.');
    }

    this.internal_assertCanDefineLocalName(localName);

    this._localNameToConstructorGetter.set(localName, constructorGetter);
    this._unflushedLocalNames.push(localName);

    // If we've already called the flush callback and it hasn't called back yet,
    // don't call it again.
    if (!this._flushPending) {
      this._flushPending = true;
      this._flushCallback(() => this._flush());
    }
  }

  /**
   * @override
   * @param {string} localName
   * @param {function(new: HTMLElement)} constructor
   */
  define(localName, constructor) {
    if (!(constructor instanceof Function)) {
      throw new TypeError('Custom element constructors must be functions.');
    }

    this.internal_assertCanDefineLocalName(localName);

    this.internal_reifyDefinition(localName, constructor);
    this._unflushedLocalNames.push(localName);

    // If we've already called the flush callback and it hasn't called back yet,
    // don't call it again.
    if (!this._flushPending) {
      this._flushPending = true;
      this._flushCallback(() => this._flush());
    }
  }

  /**
   * @param {string} localName
   */
  internal_assertCanDefineLocalName(localName) {
    if (!Utilities.isValidCustomElementName(localName)) {
      throw new SyntaxError(`The element name '${localName}' is not valid.`);
    }

    if (this.internal_localNameToDefinition(localName)) {
      throw new Error(`A custom element with name '${localName}' has already been defined.`);
    }

    if (this._elementDefinitionIsRunning) {
      throw new Error('A custom element is already being defined.');
    }
  }

  /**
   * @param {string} localName
   * @param {function(new: HTMLElement)} constructor
   * @return {!CustomElementDefinition}
   */
  internal_reifyDefinition(localName, constructor) {
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

    return definition;
  }

  /**
   * @override
   * @param {!Node} node
   */
  upgrade(node) {
    this._internals.patchAndUpgradeTree(node);
  }

  /**
   * @private
   */
  _flush() {
    // If no new definitions were defined, don't attempt to flush. This could
    // happen if a flush callback keeps the function it is given and calls it
    // multiple times.
    if (this._flushPending === false) return;
    this._flushPending = false;

    /**
     * Unupgraded elements with definitions that were defined *before* the last
     * flush, in document order.
     * @type {!Array<!HTMLElement>}
     */
    const elementsWithStableDefinitions = [];

    const unflushedLocalNames = this._unflushedLocalNames;
    const elementsWithPendingDefinitions = new Map();
    for (let i = 0; i < unflushedLocalNames.length; i++) {
      elementsWithPendingDefinitions.set(unflushedLocalNames[i], []);
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
    for (let i = 0; i < unflushedLocalNames.length; i++) {
      const localName = unflushedLocalNames[i];
      const pendingUpgradableElements = elementsWithPendingDefinitions.get(localName);

      // Attempt to upgrade all applicable elements.
      for (let i = 0; i < pendingUpgradableElements.length; i++) {
        this._internals.upgradeReaction(pendingUpgradableElements[i]);
      }

      // Resolve any promises created by `whenDefined` for the definition.
      const deferred = this._whenDefinedDeferred.get(localName);
      if (deferred) {
        deferred.resolve(undefined);
      }
    }

    unflushedLocalNames.length = 0;
  }

  /**
   * @override
   * @param {string} localName
   * @return {function(new: HTMLElement)|undefined}
   */
  get(localName) {
    const definition = this.internal_localNameToDefinition(localName);
    if (definition) {
      return definition.constructorFunction;
    }

    return undefined;
  }

  /**
   * @override
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

    // Resolve immediately if the given local name has a regular or lazy
    // definition *and* the full document walk to upgrade elements with that
    // local name has already happened.
    //
    // The behavior of the returned promise differs between the lazy and the
    // non-lazy cases if the definition fails. Normally, the definition would
    // fail synchronously and no pending promises would resolve. However, if
    // the definition is lazy but has not yet been reified, the promise is
    // resolved early here even though it might fail later when reified.
    const anyDefinitionExists = this._localNameToDefinition.has(localName) ||
        this._localNameToConstructorGetter.has(localName);
    const definitionHasFlushed = this._unflushedLocalNames.indexOf(localName) === -1;
    if (anyDefinitionExists && definitionHasFlushed) {
      deferred.resolve(undefined);
    }

    return deferred.toPromise();
  }

  /**
   * @override
   * @param {function(function())} outer
   */
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
    const existingDefinition = this._localNameToDefinition.get(localName);
    if (existingDefinition) {
      return existingDefinition;
    }

    const constructorGetter = this._localNameToConstructorGetter.get(localName);
    if (constructorGetter) {
      this._localNameToConstructorGetter.delete(localName);
      try {
        return this.internal_reifyDefinition(localName, constructorGetter());
      } catch (e) {
        this._internals.reportTheException(e);
      }
    }

    return undefined;
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
CustomElementRegistry.prototype['polyfillDefineLazy'] = CustomElementRegistry.prototype.polyfillDefineLazy;
CustomElementRegistry.prototype['polyfillWrapFlushCallback'] = CustomElementRegistry.prototype.polyfillWrapFlushCallback;
