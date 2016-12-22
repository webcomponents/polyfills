import * as CustomElementInternalSymbols from './CustomElementInternalSymbols';

const reservedTagList = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
]);

/**
 * @param {string} localName
 * @returns {boolean}
 */
export function isValidCustomElementName(localName) {
  const reserved = reservedTagList.has(localName);
  const validForm = /^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(localName);
  return !reserved && validForm;
}

/**
 * @private
 * @param {!Node} node
 */
export function isConnected(node) {
  while (node && node !== document) {
    node = node.parentNode || (node instanceof ShadowRoot ? node.host : undefined);
  }
  return node === document;
}

/**
 * @param {!Node} root
 * @param {!function(!Element)} callback
 */
export function walkDeepDescendantElements(root, callback) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  do {
    const element = /** @type {!Element} */ (walker.currentNode);
    callback(element);
    const shadowRoot = element[CustomElementInternalSymbols.shadowRoot];
    if (shadowRoot) {
      const children = shadowRoot.children;
      for (var i = 0; i < children.length; i++) {
        walkDeepDescendantElements(children[i], callback);
      }
    }
  } while (walker.nextNode());
}
