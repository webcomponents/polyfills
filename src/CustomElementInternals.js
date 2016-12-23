import {
  AlreadyConstructedMarker,
  CustomElementDefinition,
} from './CustomElementDefinition';
import * as Utilities from './Utilities';
import * as CustomElementInternalSymbols from './CustomElementInternalSymbols';
const CustomElementState = CustomElementInternalSymbols.CustomElementState;

export class CustomElementInternals {
  constructor() {
    /** @type {!Map<string, !CustomElementDefinition>} */
    this._localNameToDefinition = new Map();

    /** @type {!Map<!Function, !CustomElementDefinition>} */
    this._constructorToDefinition = new Map();
  }

  /**
   * @param {string} localName
   * @param {!CustomElementDefinition} definition
   */
  setDefinition(localName, definition) {
    this._localNameToDefinition.set(localName, definition);
    this._constructorToDefinition.set(definition.constructor, definition);
  }

  /**
   * @param {string} localName
   * @return {!CustomElementDefinition|undefined}
   */
  localNameToDefinition(localName) {
    return this._localNameToDefinition.get(localName);
  }

  /**
   * @param {!Function} constructor
   * @return {!CustomElementDefinition|undefined}
   */
  constructorToDefinition(constructor) {
    return this._constructorToDefinition.get(constructor);
  }

  /**
   * @param {!Node} root
   */
  upgradeTree(root) {
    Utilities.walkDeepDescendantElements(root, element => this.upgradeElement(element));
  }

  /**
   * @param {!Element} element
   */
  upgradeElement(element) {
    if (
      element[CustomElementInternalSymbols.state] === CustomElementState.custom ||
      element[CustomElementInternalSymbols.state] === CustomElementState.failed
    ) return;

    const definition = this.localNameToDefinition(element.localName);
    if (!definition) return;

    definition.constructionStack.push(element);

    const constructor = definition.constructor;
    try {
      try {
        let result = new (constructor)();
        if (result !== element) {
          throw new Error('The custom element constructor did not produce the element being upgraded.');
        }
      } finally {
        definition.constructionStack.pop();
      }
    } catch (e) {
      element[CustomElementInternalSymbols.state] = CustomElementState.failed;
      throw e;
    }

    element[CustomElementInternalSymbols.state] = CustomElementState.custom;
    element[CustomElementInternalSymbols.definition] = definition;

    if (definition.attributeChangedCallback) {
      for (const name of definition.observedAttributes) {
        const value = element.getAttribute(name);
        if (value !== null) {
          this.attributeChangedCallback(element, name, null, value, null);
        }
      }
    }

    if (Utilities.isConnected(element)) {
      this.connectedCallback(element);
    }
  }

  /**
   * @param {!Element} element
   */
  connectedCallback(element) {
    if (element[CustomElementInternalSymbols.state] === CustomElementState.custom) {
      const definition = element[CustomElementInternalSymbols.definition];
      if (definition && definition.connectedCallback) {
        definition.connectedCallback.call(element);
      }
    }
  }

  /**
   * @param {!Element} element
   */
  disconnectedCallback(element) {
    if (element[CustomElementInternalSymbols.state] === CustomElementState.custom) {
      const definition = element[CustomElementInternalSymbols.definition];
      if (definition && definition.disconnectedCallback) {
        definition.disconnectedCallback.call(element);
      }
    }
  }

  /**
   * @param {!Element} element
   * @param {string} name
   * @param {?string} oldValue
   * @param {?string} newValue
   * @param {?string} namespace
   */
  attributeChangedCallback(element, name, oldValue, newValue, namespace) {
    if (element[CustomElementInternalSymbols.state] === CustomElementState.custom) {
      const definition = element[CustomElementInternalSymbols.definition];
      if (
        definition &&
        definition.attributeChangedCallback &&
        definition.observedAttributes.indexOf(name) > -1
      ) {
        definition.attributeChangedCallback.call(element, name, oldValue, newValue, namespace);
      }
    }
  }
}
