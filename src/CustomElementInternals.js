import {
  AlreadyConstructedMarker,
  CustomElementDefinition,
} from './CustomElementDefinition';
import * as Utilities from './Utilities';

const randomString = () => Math.random().toString(32).substring(2);

export const elementState = 'elementState_' + randomString();
export const elementDefinition = 'elementDefinition_' + randomString();

/**
 * @enum {number}
 */
export const CustomElementState = {
  custom: 1,
  failed: 2,
};

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
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    do {
      const currentNode = /** @type {!Element} */ (walker.currentNode);
      this.upgradeElement(currentNode);
    } while (walker.nextNode());
  }

  /**
   * @param {!Element} element
   */
  upgradeElement(element) {
    if (
      element[elementState] === CustomElementState.custom ||
      element[elementState] === CustomElementState.failed
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
      element[elementState] = CustomElementState.failed;
      throw e;
    }

    element[elementState] = CustomElementState.custom;
    element[elementDefinition] = definition;

    if (Utilities.isConnected(element)) {
      this.connectedCallback(element);
    }

    // TODO(bicknellr): Run attributeChangedCallback for set attributes.
  }

  /**
   * @param {!Element} element
   */
  connectedCallback(element) {
    if (element[elementState] === CustomElementState.custom) {
      const definition = element[elementDefinition];
      if (!(definition && definition.connectedCallback)) return;
      definition.connectedCallback.call(element);
    }
  }
}

CustomElementInternals.elementState = elementState;
