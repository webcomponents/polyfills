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
 * Parse a CSS Shadow Parts "part" attribute into an array of part names.
 *
 * Example:
 *   "foo bar" => ["foo", "bar"]
 *
 * @param {?string} attr The "part" attribute value.
 * @return {!Array<{inner: !string, outer: !string}>}
 */
export function parsePartAttribute(attr) {
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
export function parseExportPartsAttribute(attr) {
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
 * Format the ShadyCSS class name for a part node.
 *
 * Examples:
 *
 *   #document
 *     <x-1>
 *       #shady-root
 *         <div part="p1" class="part_document_x-1_p1"></div>
 *         <x-2>
 *           #shady-root
 *             <div part="p2" class="part_x-1_x-2_p2"></div>
 *
 * @param {!string} scope Lowercase custom element name of the part node's
 *     host.
 * @param {!string} hostScope Lowercase custom-element name of the part
 *     node's host's host, or "document" if the host is in the main document.
 * @param {!string} partName Name of the part.
 * @return {!string} Class name.
 */
export function formatPartScopeClassName(partName, scope, hostScope) {
  return `part_${hostScope}_${scope}_${partName}`;
}

/**
 * Add the appropriate "part_" class to any parts in the Shady root of the
 * given host.
 * @param {!HTMLElement} host
 */
export function scopePartsInShadyRoot(host) {
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
    const partAttr = partNode.getAttribute('part');
    for (const partName of parsePartAttribute(partAttr)) {
      const className = formatPartScopeClassName(partName, scope, hostScope);
      partNode.classList.add(className);

      const exportParts = exportPartsMap[partName];
      if (exportParts !== undefined) {
        for (const {partName, scope, hostScope} of exportParts) {
          const className = formatPartScopeClassName(partName, scope, hostScope);
          partNode.classList.add(className);
        }
      }
    }
  }
}

/**
 * TODO(aomarks) Description
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
 * TODO(aomarks) Description
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
 * #document
 *   <x-a exportparts="x">
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
 */
