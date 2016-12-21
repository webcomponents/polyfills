import CustomElementDefinition from './CustomElementDefinition';

const upgraded = '__CE__upgraded_' + Math.random().toString(32).substring(2);

class CustomElementInternals {
  constructor() {
    console.log('CustomElementInternals constructed');

    /** @type {!Map<string, !CustomElementDefinition>} */
    this._nameToDefinition = new Map();

    /** @type {!Map<!Function, string>} */
    this._constructorToName = new Map();
  }

  /**
   * @param {string} name
   * @param {!CustomElementDefinition} definition
   */
  setDefinition(name, definition) {
    this._nameToDefinition.set(name, definition);
    this._constructorToName.set(definition.constructor, name);
  }

  /**
   * @param {string} name
   */
  hasDefinitionForName(name) {
    return this._nameToDefinition.has(name);
  }

  /**
   * @param {string} name
   * @return {?CustomElementDefinition}
   */
  getDefinitionByName(name) {
    return this._nameToDefinition.get(name);
  }

  /**
   * @param {!Function} constructor
   * @return {!CustomElementDefinition|undefined}
   */
  getDefinitionByConstructor(constructor) {
    const name = this._constructorToName.get(constructor);
    if (!name) {
      return undefined;
    }
    return this._nameToDefinition.get(name);
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

    const definition = this._nameToDefinition.get(element.localName);
    if (!definition) return;

    console.log('UPGRADE:', element);
    // TODO(bicknellr): Actually upgrade.

    element[upgraded] = true;
  }
}

export default CustomElementInternals;
