import BuiltIn from './BuiltIn';
import {CustomElementInternals} from '../CustomElementInternals';

/**
 * @param {!CustomElementInternals} internals
 */
export default function(internals) {
  /**
   * @param {string} localName
   * @return {!Element}
   * @suppress {duplicate}
   */
  Document.prototype.createElement = function(localName) {
    const definition = internals.localNameToDefinition(localName);
    if (definition) {
      return new (definition.constructor)();
    }

    return BuiltIn.Document_createElement.call(this, localName);
  };

  /**
   * @param {!Node} node
   * @param {boolean=} deep
   * @return {!Node}
   * @suppress {duplicate}
   */
  Document.prototype.importNode = function(node, deep) {
    const clone = BuiltIn.Document_importNode.call(this, node, deep);
    internals.upgradeTree(clone);
    return clone;
  };

  const NS_HTML = "http://www.w3.org/1999/xhtml";

  /**
   * @param {?string} namespace
   * @param {string} localName
   * @return {!Element}
   * @suppress {duplicate}
   */
  Document.prototype.createElementNS = function(namespace, localName) {
    if (namespace === null || namespace === NS_HTML) {
      return this.createElement(localName);
    }

    return BuiltIn.Document_createElementNS.call(this, namespace, localName);
  };
};
