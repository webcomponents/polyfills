/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/**
 * The general strategy for CSS Shadow Parts support in Shady CSS is
 * illustrated by this example:
 *
 * #document
 *   <style>
 *     x-a::part(a1) {
 *       color: red;
 *     }
 *     x-a::part(a2) {
 *       color: green;
 *     }
 *     x-a::part(a3) {
 *       color: blue;
 *     }
 *   </style>
 *   <x-a>
 *     #shadow-root
 *       <div part="a1"></div>
 *       <x-b exportparts="b1:a2,b2:a3">
 *         #shadow-root
 *           <div part="b1"></div>
 *           <x-c exportparts="c1:b2">
 *             #shadow-root
 *               <div part="c1"></div>
 *           </x-c>
 *       </x-b>
 *   </x-a>
 *
 * Becomes:
 *
 * #document
 *   <style>
 *     .part_document_x-a_a1 {
 *       color: red;
 *     }
 *     .part_document_x-a_a2 {
 *       color: green;
 *     }
 *     .part_document_x-a_a3 {
 *       color: blue;
 *     }
 *   </style>
 *   <x-a exportparts>
 *     #shadow-root
 *       <div part="a1"
 *            class="part_document_x-a_a1"></div>
 *       <x-b exportparts="b1:a2,b2:a3">
 *         #shadow-root
 *           <div part="b1"
 *                class="part_x-a_x-b_b1
 *                       part_document_x-a_a2"></div>
 *           <x-c exportparts="c1:b2">
 *             #shadow-root
 *               <div part="c1"
 *                    class="part_x-b_x-c_c1
 *                           part_x-a_x-b_b2
 *                           part_document_x-a_a3"></div>
 *           </x-c>
 *       </x-b>
 *   </x-a>
 *
 * Limitations:
 *
 * [1] ::part rules must include a custom-element name.
 *
 *    (A) x-a::part(foo)      OK
 *    (B) .clz x-a::part(foo) OK (TODO(aomarks) But could be wrong, right?)
 *    (C) x-a.bar::part(foo)  OK (except recursive patterns, see [3])
 *    (D) ::part(foo)         UNSUPPORTED
 *    (E) .bar::part(foo)     UNSUPPORTED
 *
 * [2] Recursive patterns are not supported.
 *
 *     TODO(aomarks) Example
 *
 * [3] Part style rules cannot change. If dynamism is needed, write a ::part
 *     rule for each state, predicated on some class or other attribute, and
 *     toggle that class or attribute on the dynamic element.
 *
 * [4] Part rules must appear inside a <template> or document-level <style>
 *     that has been prepared by ShadyCSS.
 */

/**
 * Parse a CSS Shadow Parts "part" attribute into an array of part names.
 *
 * Example:
 *   "foo bar" => ["foo", "bar"]
 *
 * @param {?string} attr The "part" attribute value.
 * @return {!Array<!string>}
 */
function parsePartAttribute(attr) {
  if (!attr) {
    return [];
  }
  return attr.trim().split(/\s+/);
}

/**
 * Parse a CSS Shadow Parts "exportparts" attribute into an array of
 * inner/outer part mappings.
 *
 * Example:
 *   "foo,bar:baz" => [{inner:"foo", outer:"foo"},
 *                     {inner:"bar", outer:"baz"}]
 *
 * @param {?string} attr The "exportparts" attribute value.
 * @return {!Array<{inner: !string, outer: !string}>}
 */
function parseExportPartsAttribute(attr) {
  if (!attr) {
    return [];
  }
  const parts = [];
  for (const part of attr.split(/\s*,\s*/)) {
    const split = part.split(/\s*:\s*/);
    let inner, outer;
    if (split.length === 1) {
      inner = outer = split[0];
    } else if (split.length === 2) {
      inner = split[0];
      outer = split[1];
    } else {
      continue;
    }
    parts.push({inner, outer});
  }
  return parts;
}

/**
 * Format the ShadyCSS class name for a part.
 *
 * @param {!string} partName Name of the part.
 * @param {!string} scope Lowercase custom element name of the part node's
 *     host.
 * @param {!string} hostScope Lowercase custom-element name of the part
 *     node's host's host, or "document" if the host is in the main document.
 * @return {!string} CSS class name.
 */
export function formatPartSpecifier(partName, scope, hostScope) {
  return `${hostScope}_${scope}_${partName}`;
}

/**
 * Format the ShadyCSS selector for a part rule.
 *
 * @param {!string} parts Whitespace-separated part list.
 * @param {!string} scope Lowercase custom element name of the part node's
 *     host.
 * @param {!string} hostScope Lowercase custom-element name of the part
 *     node's host's host, or "document" if the host is in the main document.
 * @return {!string} CSS class selector.
 */
export function formatPartSelector(parts, scope, hostScope) {
  return parsePartAttribute(parts).map(
      (part) => `[shady-part~=${formatPartSpecifier(part, scope, hostScope)}]`)
    .join('');
}

/**
 * TODO
 *
 * @param {!Element}
 * @return {void}
 */
export function addPartSpecifier(element, specifier) {
  const existing = element.getAttribute('shady-part');
  if (existing === null) {
    element.setAttribute('shady-part', specifier);
  } else {
    element.setAttribute('shady-part', existing + ' ' + specifier);
  }
}

/**
 * Remove all part classes from the given element.
 *
 * @param {!Element}
 * @return {void}
 */
export function removeAllPartSpecifiers(element) {
  element.removeAttribute('shady-part');
}

/**
 * Return the name that identifies the given root. Either the lowercase name of
 * the host element, or "document" if this is the document.
 *
 * @param {!ShadowRoot|!Document} host
 * @return {!string|undefined}
 */
function scopeForRoot(root) {
  if (root === document) {
    // TODO(aomarks) Should this check host.ownerDocument instead?
    return 'document';
  }
  if (root.host) {
    return root.host.localName;
  }
}

/**
 * Add the appropriate "part_" class to all parts in the Shady root of the
 * given host.
 *
 * @param {!HTMLElement} host
 */
export function scopeAllHostParts(host) {
  if (!host.shadowRoot) {
    return;
  }
  const partNodes = host.shadowRoot.querySelectorAll('[part]');
  if (partNodes.length === 0) {
    return;
  }

  const root = host.getRootNode();
  const hostScope = scopeForRoot(root);
  if (hostScope === undefined) {
    return;
  }

  const scope = host.localName;
  const exportPartsMap = getExportPartsMap(host);

  for (const partNode of partNodes) {
    removeAllPartSpecifiers(partNode);
    const partAttr = partNode.getAttribute('part');
    for (const partName of parsePartAttribute(partAttr)) {
      addPartSpecifier(partNode, formatPartSpecifier(partName, scope, hostScope));
      const exportParts = exportPartsMap[partName];
      if (exportParts !== undefined) {
        for (const {partName, scope, hostScope} of exportParts) {
          addPartSpecifier(partNode, formatPartSpecifier(partName, scope, hostScope));
        }
      }
    }
  }
}

/**
 * @param {!HTMLElement} element
 * @param {!Array<!string>} partNames
 */
function addPartSpecifiersToElement(element, partNames) {
  const root = element.getRootNode();
  if (root === element || root === document) {
    // Not yet in a shadow root or in the document, in which case parts can't
    // possibly be applied.
    return;
  }
  const host = root.host;
  const scope = host.localName;
  const superRoot = host.getRootNode();
  const superScope = (superRoot === document)
      ? 'document' : superRoot.host.localName;

  const exportPartsMap = getExportPartsMap(host);

  for (const partName of partNames) {
    addPartSpecifier(element, formatPartSpecifier(partName, scope, superScope));
    const exportParts = exportPartsMap[partName];
    if (exportParts !== undefined) {
      for (const {partName, scope, hostScope} of exportParts) {
        addPartSpecifier(element, formatPartSpecifier(partName, scope, hostScope));
      }
    }
  }
}

/**
 * TODO
 * @param {*} element
 */
function rescopeRecursive(element) {
  element.shadyCssExportPartsMap = undefined;
  if (element.shadowRoot) {
    scopeAllHostParts(element);
    const exports = element.shadowRoot.querySelectorAll('[exportparts]');
    for (const child of exports) {
      child.shadyCssExportPartsMap = undefined;
      rescopeRecursive(child);
    }
  }
}

/**
 * TODO(aomarks) Description
 *
 * @param {!HTMLElement} host
 * @return {!Object<!string, {
 *     partName: string,
 *     scope: string,
 *     hostScope: string
 *   }>}
 */
function getExportPartsMap(host) {
  // TODO(aomarks) Add to externs (or move).
  if (host.shadyCssExportPartsMap !== undefined) {
    return host.shadyCssExportPartsMap;
  }
  const map = {};
  host.shadyCssExportPartsMap = map;

  const attr = host.getAttribute('exportparts');
  if (attr === null) {
    return map;
  }

  const root = host.getRootNode();
  if (root === document) {
    // TODO(aomarks) Document why.
    return map;
  }

  const superHost = root.host;
  const scope = superHost.localName;
  const superRoot = superHost.getRootNode();
  const hostScope = scopeForRoot(superRoot);
  if (hostScope === undefined) {
    return map;
  }

  const superExports = getExportPartsMap(superHost);

  for (const {inner, outer} of parseExportPartsAttribute(attr)) {
    let arr = map[inner];
    if (arr === undefined) {
      arr = [];
      map[inner] = arr;
    }
    arr.push({hostScope, scope, partName: outer});
    const superParts = superExports[outer];
    if (superParts !== undefined) {
      for (const partData of superParts) {
        arr.push(partData);
      }
    }
  }

  return map;
}

/**
 * TODO
 * @param {!HTMLElement} element
 */
export function onStyleElement(element) {
  requestAnimationFrame(() => {
    scopeAllHostParts(element);
  });
}

/**
 * TODO
 * @param {TODO} parentNode
 * @param {*} newNode
 * @param {*} referenceNode
 */
export function onInsertBefore(parentNode, newNode, referenceNode) {
  const root = newNode.getRootNode();
  if (root.host) {
    // TODO(aomarks) Optimize.
    rescopeRecursive(root.host);
  }
}

/**
 * Update a node whose "part" attribute has changed.
 *
 * @param {!HTMLElement} element
 * @param {?string} newValue
 */
export function onPartAttributeChanged(element, newValue) {
  if (!newValue) {
    removeAllPartSpecifiers(element);
  } else {
    addPartSpecifiersToElement(element, parsePartAttribute(newValue));
  }
}

/**
 * Update a node whose "exportparts" attribute has changed.
 *
 * @param {!HTMLElement} element
 * @param {?string} newValue
 */
export function onExportPartsAttributeChanged(element, oldValue, newValue) {
  // TODO(aomarks) Optimize.
  rescopeRecursive(element);
}
