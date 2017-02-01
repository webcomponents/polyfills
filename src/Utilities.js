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
    // TODO: Change this check from testing if the node is a DocumentFragment to
    // testing `instanceof ShadowRoot` when shadydom exposes its implementation
    // of ShadowRoot.
    node = node.parentNode || (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.host : undefined);
  }
  return !!(node && (node.__CE_isImportDocument || node instanceof Document));
}

/**
 * @param {!Node} root
 * @param {!Node} start
 * @return {?Node}
 */
function nextSiblingOrAncestorSibling(root, start) {
  let node = start;
  while (node && node !== root && !node.nextSibling) {
    node = node.parentNode;
  }
  return (!node || node === root) ? null : node.nextSibling;
}

/**
 * @param {!Node} root
 * @param {!Node} start
 * @return {?Node}
 */
function nextNode(root, start) {
  return start.firstChild ? start.firstChild : nextSiblingOrAncestorSibling(root, start);
}

/**
 * @param {!Node} root
 * @param {!function(!Element)} callback
 */
export function walkDeepDescendantElements(root, callback) {
  let node = root;

  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      callback(node);

      // Ignore descendants of link elements to prevent attempting to traverse
      // elements created by the HTML Imports polyfill. When upgrading a tree,
      // `CustomElementInternals#patchAndUpgradeTree` walks the `import` property
      // of import links, which will point to either the true imported document
      // (native) or the descendant containing the elements created to emulate the
      // imported document (polyfill).
      if (node.localName === 'link') {
        node = nextSiblingOrAncestorSibling(root, node);
        continue;
      }

      // Walk shadow roots.
      const shadowRoot = node.__CE_shadowRoot;
      if (shadowRoot) {
        for (let child = shadowRoot.firstChild; child; child = child.nextSibling) {
          walkDeepDescendantElements(child, callback);
        }
      }
    }

    node = nextNode(root, node);
  }
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
