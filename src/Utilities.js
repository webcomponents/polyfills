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
  while (node && !(node instanceof Document)) {
    node = node.parentNode || (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.host : undefined);
  }
  return node instanceof Document;
}

/**
 * @param {!Node} root
 * @param {!function(!Element)} callback
 */
export function walkDeepDescendantElements(root, callback) {
  // IE throws on `walker.nextNode()` if the root given to TreeWalker is a text node.
  if (root.nodeType === Node.TEXT_NODE) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
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
