import CustomElementInternals from './CustomElementInternals';
import Deferred from './Deferred';
import * as Utilities from './Utilities';

export default class CustomElementRegistry {

  /**
   * @param {!CustomElementInternals} internals
   */
  constructor(internals) {
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
     * @private
     * @type {Function|undefined}
     */
    this._flushCallback = undefined;

    /**
     * @private
     * @type {boolean}
     */
    this._flushScheduled = false;

    /**
     * @private
     * @type {!Array<string>}
     */
    this._pendingDeferred = [];
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

    if (this._internals.localNameToDefinition(localName)) {
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
      observedAttributes = constructor['observedAttributes'] || [];
    } catch (e) {
      return;
    } finally {
      this._elementDefinitionIsRunning = false;
    }

    const definition = {
      localName,
      constructor,
      connectedCallback,
      disconnectedCallback,
      adoptedCallback,
      attributeChangedCallback,
      observedAttributes,
      constructionStack: [],
    };

    this._internals.setDefinition(localName, definition);

    // If no flush is scheduled and no flush gate function is defined, we can
    // walk everything on this definition.
    if (!this._flushScheduled && !this._flushCallback) {
      this._internals.patchAndUpgradeTree(document);

      const deferred = this._whenDefinedDeferred.get(localName);
      if (deferred) {
        deferred.resolve(undefined);
      }
    } else {
      this._pendingDeferred.push(localName);

      // If we've already scheduled a flush, don't schedule a new one.
      if (!this._flushScheduled) {
        this._flushScheduled = true;
        this._flushCallback(() => this._doFlush());
      }
    }
  }

  _doFlush() {
    // If no new definitions were defined, don't attempt to flush.
    if (this._flushScheduled === false) return;

    this._flushScheduled = false;
    this._internals.patchAndUpgradeTree(document);

    while (this._pendingDeferred.length > 0) {
      const localName = this._pendingDeferred.shift();
      const deferred = this._whenDefinedDeferred.get(localName);
      if (deferred) {
        deferred.resolve(undefined);
      }
    }
  }

  /**
   * @param {Function} flushCallback
   */
  polyfillSetFlushCallback(flushCallback) {
    if (flushCallback === undefined) {
      this._doFlush();
    }
    this._flushCallback = flushCallback;
  }

  /**
   * @param {string} localName
   * @return {Function|undefined}
   */
  get(localName) {
    const definition = this._internals.localNameToDefinition(localName);
    if (definition) {
      return definition.constructor;
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

    const definition = this._internals.localNameToDefinition(localName);
    if (definition) {
      deferred.resolve(undefined);
    }

    return deferred.toPromise();
  }
}

// Closure compiler exports.
window['CustomElementRegistry'] = CustomElementRegistry;
CustomElementRegistry.prototype['define'] = CustomElementRegistry.prototype.define;
CustomElementRegistry.prototype['get'] = CustomElementRegistry.prototype.get;
CustomElementRegistry.prototype['whenDefined'] = CustomElementRegistry.prototype.whenDefined;
CustomElementRegistry.prototype['polyfillSetFlushCallback'] = CustomElementRegistry.prototype.polyfillSetFlushCallback;
