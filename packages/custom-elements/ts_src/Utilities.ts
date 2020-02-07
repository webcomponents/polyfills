/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {HTMLImportElement} from './Externs.js';

const reservedElementNameSet = new Set<string>();
// IE11 does not support constructing a set using an iterable.
['annotation-xml',
 'color-profile',
 'font-face',
 'font-face-src',
 'font-face-uri',
 'font-face-format',
 'font-face-name',
 'missing-glyph',
].forEach(item => reservedElementNameSet.add(item));

export function isValidCustomElementName(localName: string) {
  const reserved = reservedElementNameSet.has(localName);
  const validForm = /^[a-z][.0-9_a-z]*-[-.0-9_a-z]*$/.test(localName);
  return !reserved && validForm;
}

// Note, IE11 doesn't have `document.contains`.
const nativeContains = document.contains ?
    document.contains.bind(document) :
    document.documentElement.contains.bind(document.documentElement);

export function isConnected(node: Node) {
  // Use `Node#isConnected`, if defined.
  const nativeValue = node.isConnected;
  if (nativeValue !== undefined) {
    return nativeValue;
  }
  // Optimization: It's significantly faster here to try to use `contains`,
  // especially on Edge/IE/
  if (nativeContains(node)) {
    return true;
  }

  let current: Node|undefined = node;
  while (current &&
         !(current.__CE_isImportDocument || current instanceof Document)) {
    current = current.parentNode ||
        (window.ShadowRoot && current instanceof ShadowRoot ? current.host :
                                                              undefined);
  }
  return !!(
      current &&
      (current.__CE_isImportDocument || current instanceof Document));
}

export function childrenFromFragment(fragment: DocumentFragment): Array<Element> {
  // Note, IE doesn't have `children` on document fragments.
  const nativeChildren = fragment.children;
  if (nativeChildren) {
    return Array.prototype.slice.call(nativeChildren);
  }
  const children: Array<Element> = [];
  for (let n = fragment.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      children.push(n as Element);
    }
  }
  return children;
}

function nextSiblingOrAncestorSibling(root: Node, start: Node) {
  let node: Node|null = start;
  while (node && node !== root && !node.nextSibling) {
    node = node.parentNode;
  }
  return (!node || node === root) ? null : node.nextSibling;
}


function nextNode(root: Node, start: Node) {
  return start.firstChild ? start.firstChild :
                            nextSiblingOrAncestorSibling(root, start);
}

export function walkDeepDescendantElements(
    root: Node, callback: (elem: Element) => void, visitedImports?: Set<Node>) {
  let node: Node|null = root;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;

      callback(element);

      const localName = element.localName;
      if (localName === 'link' && element.getAttribute('rel') === 'import') {
        // If this import (polyfilled or not) has its root node available,
        // walk it.
        const importNode = (element as HTMLImportElement).import;
        if (visitedImports === undefined) {
          visitedImports = new Set();
        }
        if (importNode instanceof Node && !visitedImports.has(importNode)) {
          // Prevent multiple walks of the same import root.
          visitedImports.add(importNode);

          for (let child = importNode.firstChild; child;
               child = child.nextSibling) {
            walkDeepDescendantElements(child, callback, visitedImports);
          }
        }

        // Ignore descendants of import links to prevent attempting to walk the
        // elements created by the HTML Imports polyfill that we just walked
        // above.
        node = nextSiblingOrAncestorSibling(root, element);
        continue;
      } else if (localName === 'template') {
        // Ignore descendants of templates. There shouldn't be any descendants
        // because they will be moved into `.content` during construction in
        // browsers that support template but, in case they exist and are still
        // waiting to be moved by a polyfill, they will be ignored.
        node = nextSiblingOrAncestorSibling(root, element);
        continue;
      }

      // Walk shadow roots.
      const shadowRoot = element.__CE_shadowRoot;
      if (shadowRoot) {
        for (let child = shadowRoot.firstChild; child;
             child = child.nextSibling) {
          walkDeepDescendantElements(child, callback, visitedImports);
        }
      }
    }

    node = nextNode(root, node);
  }
}
