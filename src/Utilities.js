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
 * @return {boolean}
 */
export function isConnected(node) {
  // Use `Node#isConnected`, if defined.
  const nativeValue = node.isConnected;
  if (nativeValue !== undefined) {
    return nativeValue;
  }

  while (node && !(node.__CE_isImportDocument || node instanceof Document)) {
    node = node.parentNode || (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.host : undefined);
  }
  return !!(node && (node.__CE_isImportDocument || node instanceof Document));
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

    // Ignore descendants of link elements to prevent attempting to traverse
    // elements created by the HTML Imports polyfill. When upgrading a tree,
    // `CustomElementInternals#upgradeTree` by walks the `import` property of
    // import links, which will point to either the true imported document
    // (native) or the descendant containing the elements created to emulate the
    // imported document (polyfill).
    if (element.localName === 'link') {
      walker.currentNode = element.lastChild || element;
      continue;
    }

    const shadowRoot = element.__CE_shadowRoot;
    if (shadowRoot) {
      const children = shadowRoot.children;
      for (var i = 0; i < children.length; i++) {
        walkDeepDescendantElements(children[i], callback);
      }
    }
  } while (walker.nextNode());
}

/**
 * Used to suppress Closure's "Modifying the prototype is only allowed if the
 * constructor is in the same scope" warning without using
 * `@suppress {newCheckTypes, duplicate}` because `newCheckTypes` is too broad.
 *
 * @param {!Object} destination
 * @param {string} name
 * @param {*} value
 */
export function setPropertyUnchecked(destination, name, value) {
  destination[name] = value;
}
