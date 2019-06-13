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
import * as Utilities from './Utilities.js';

let elementDefinitionIsRunning = false;

export default class CustomElementDefinitionProducer {

  /**
   * @param {string} localName
   * @param {!Function} constructorOrGetter
   * @param {boolean} isGetter
   * @param {!CustomElementInternals} internals
   */
  constructor(localName, constructorOrGetter, isGetter, internals) {

    /**
     * @private
     * @const {!CustomElementInternals}
     */
    this._internals = internals;

    /**
     * @private
     * @const {!Function}
     */
    this._constructorOrGetter = constructorOrGetter;

    /**
     * @private
     * @const {boolean}
     */
    this._isGetter = isGetter;

    /** @const {string} */
    this.localName = localName;

    /**
     * @private
     * @type {!CustomElementDefinition|undefined}
     */
    this._definition = undefined;

    if (this._isGetter && !(constructorOrGetter instanceof Function)) {
      throw new TypeError('Custom element constructor getters must be functions.');
    }

    if (!Utilities.isValidCustomElementName(localName)) {
      throw new SyntaxError(`The element name '${localName}' is not valid.`);
    }

    const existingProducer = this._internals.localNameToDefinitionProducer(localName);
    // Note, only throw if the existing producer has a valid definition.
    // If it does not, then re-defining is ok.
    if (existingProducer && existingProducer.definition) {
      throw new Error(`A custom element with name '${localName}' has already been defined.`);
    }

    if (elementDefinitionIsRunning) {
      throw new Error('A custom element is already being defined.');
    }

    // Per spec, reify the definition immediately if possible.
    if (!this._isGetter) {
      this._ensureDefinition();
    }

    this._internals.setDefinitionProducer(this.localName, this);
  }

  /** @return {!CustomElementDefinition} */
  get definition() {
    try {
      return this._ensureDefinition();
    } catch (e) {
      // If this definition is invalid, release it so it can be defined again.
      this._internals.removeDefinitionProducer(this.localName);
      // Note, if an error is generated while reading the definition, it's when
      // the polyfill is in the processing of upgrading an entire tree and we
      // don't want this to fail.
      console.error(e);
    }
  }

  /** @return {!CustomElementDefinition} */
  _ensureDefinition() {
    if (this._definition) {
      return this._definition;
    }
    elementDefinitionIsRunning = true;
    let connectedCallback;
    let disconnectedCallback;
    let adoptedCallback;
    let attributeChangedCallback;
    let observedAttributes;
    let constructorFunction;
    try {
      constructorFunction = this._isGetter ? this._constructorOrGetter() :
        this._constructorOrGetter;
      if (!(constructorFunction instanceof Function)) {
        throw new TypeError('Custom element constructors must be functions.');
      }
      /** @type {!Object} */
      const prototype = constructorFunction.prototype;
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
      // Note, `observedAttributes` should only be read if
      // `attributeChangedCallback` exists.
      observedAttributes = (attributeChangedCallback &&
        constructorFunction['observedAttributes']) || [];
    } catch (e) {
      throw e;
    } finally {
      elementDefinitionIsRunning = false;
    }

    this._definition = {
      localName: this.localName,
      constructorFunction,
      connectedCallback,
      disconnectedCallback,
      adoptedCallback,
      attributeChangedCallback,
      observedAttributes,
      constructionStack: []
    };

    this._internals.setDefinitionConstructor(this._definition);

    return this._definition;
  }

}
