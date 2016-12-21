import CustomElementDefinition from './CustomElementDefinition';

const upgraded = '__CE__upgraded_' + Math.random().toString(32).substring(2);

class CustomElementInternals {
  constructor() {
    console.log('CustomElementInternals constructed');

    /** @type {!Map<string, !CustomElementDefinition>} */
    this._localNameToDefinition = new Map();

    /** @type {!Map<!Function, string>} */
    this._constructorToLocalName = new Map();
  }

  /**
   * @param {string} localName
   * @param {!CustomElementDefinition} definition
   */
  setDefinition(localName, definition) {
    this._localNameToDefinition.set(localName, definition);
    this._constructorToLocalName.set(definition.constructor, localName);
  }

  /**
   * @param {string} localName
   * @return {?CustomElementDefinition}
   */
  localNameToDefinition(localName) {
    return this._localNameToDefinition.get(localName);
  }

  /**
   * @param {!Function} constructor
   * @return {string}
   */
  constructorToLocalName(constructor) {
    return this._constructorToLocalName.get(constructor);
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
    if (element[upgraded]) return;

    const definition = this._localNameToDefinition.get(element.localName);
    if (!definition) return;

    console.log('UPGRADE:', element);
    // TODO(bicknellr): Actually upgrade.

    element[upgraded] = true;
  }
}

export default CustomElementInternals;
