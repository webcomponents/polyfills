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
 *   Given: "foo bar  foo "
 *   Returns: ["foo", "bar", "foo"]
 *
 * @param {?string} str The "part" attribute value.
 * @return {!Array<!string>} The part names. Order and duplicates are preserved.
 */
export function splitPartString(str) {
  if (!str) {
    return [];
  }
  return str.trim().split(/\s+/);
}

/**
 * Parse a CSS Shadow Parts "exportparts" attribute into an array of inner/outer
 * part mappings.
 *
 * Example:
 *   Given: "foo, bar:baz"
 *   Returns: [
 *     {inner:"foo", outer:"foo"},
 *     {inner:"bar", outer:"baz"},
 *   ]
 *
 * @param {?string} attr The "exportparts" attribute value.
 * @return {!Array<{inner: !string, outer: !string}>} The inner/outer mapping.
 * Order and duplicates are preserved.
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
      // E.g. "foo"
      inner = outer = split[0];
    } else if (split.length === 2) {
      // E.g. "foo:bar"
      inner = split[0];
      outer = split[1];
    } else {
      // E.g. "foo:bar:baz". Invalid format; skip but keep parsing (this
      // matches native behavior).
      continue;
    }
    parts.push({inner, outer});
  }
  return parts;
}

/**
 * Regular expression to de-compose a ::part rule into interesting pieces. See
 * parsePartSelector for description of pieces.
 *                  [0  ][1         ][2      ]        [3 ]   [4   ]
 */
const PART_REGEX = /(.*?)([a-z]+-\w+)([^\s]*?)::part\((.*)?\)(::?.*)?/;

/**
 * De-compose a ::part rule into interesting pieces.
 *
 * [0] combinators: Optional combinator selectors constraining the receiving
 *     host.
 * [1] elementName: Required custom element name of the receiving host. Note
 *     that ShadyCSS part support requires there to be an explicit custom
 *     element name here, unlike native parts.
 * [2] selectors: Optional additional selectors constraining the receiving host.
 * [3] parts: The part name or names (whitespace-separated, this function does
 *     not split them).
 * [4] pseudos: Optional pseudo-classes or pseudo-elements of the part.
 *
 *     TODO(aomarks) Actually only "non-structural" pseudo-classes and
 *     pseudo-elements are supported here. We should validate them to be more
 *     spec-compliant.
 *
 * Example:
 *   [0       ][1      ][2   ]       [3    ] [4   ]
 *   #parent > my-button.fancy::part(foo bar):hover
 *
 * @param {!string} selector The selector.
 * @return {?{
 *   combinators: !string,
 *   elementName: !string,
 *   selectors: !string,
 *   parts: !string,
 *   pseudos: !string
 * }}
 */
export function parsePartSelector(selector) {
  const match = selector.match(PART_REGEX);
  if (match === null) {
    return null;
  }
  const [, combinators, elementName, selectors, parts, pseudos] = match;
  return {combinators, elementName, selectors, parts, pseudos: pseudos || ''};
}

/**
 * Format the shady-part attribute value for a part.
 *
 * Example:
 *   Given: "x-app", "x-btn", "prt1"
 *   Returns: "x-app:x-btn:prt1"
 *
 * @param {!string} providerScope Lowercase name of the custom element that
 *     provides the part style, or "document" if the style comes from the main
 *     document.
 * @param {!string} receiverScope Lowercase name of the custom element that
 *     receives the part style.
 * @param {!string} partName Name of the part.
 * @return {!string} Value for the shady-part attribute.
 */
export function formatShadyPartAttribute(
  providerScope,
  receiverScope,
  partName
) {
  return `${providerScope}:${receiverScope}:${partName}`;
}

/**
 * Format the shady-part attribute CSS selector for a part rule.
 *
 * Example:
 *   Given: "x-app", "x-btn", "prt1 prt2"
 *   Returns: '[shady-part~="x-app:x-btn:prt1"][shady-part~="x-app:x-btn:prt2"]'
 *
 * @param {!string} providerScope Lowercase name of the custom element that
 *     provides the part style, or "document" if the style comes from the main
 *     document.
 * @param {!string} receiverScope Lowercase name of the custom element that
 *     receives the part style.
 * @param {!string} partNames Whitespace-separated part list.
 * @return {!string} shady-part attribute CSS selector.
 */
export function formatShadyPartSelector(
  providerScope,
  receiverScope,
  partNames
) {
  return splitPartString(partNames)
    .map((partName) => {
      const attr = formatShadyPartAttribute(
        providerScope,
        receiverScope,
        partName
      );
      return `[shady-part~="${attr}"]`;
    })
    .join('');
}

/*  eslint-disable no-unused-vars */
/**
 * Add "shady-part" attributes to new nodes on insertion.
 *
 * This function will be called by ShadyDOM during any insertBefore call,
 * before the native insert has occured.
 *
 * @param {!HTMLElement} parentNode
 * @param {!HTMLElement} newNode
 * @param {?HTMLElement} referenceNode
 * @return {void}
 */
export function onInsertBefore(parentNode, newNode, referenceNode) {
  /* eslint-enable no-unused-vars */
  if (!parentNode.getRootNode) {
    // TODO(aomarks) We're in noPatch mode. Wrap where needed and add tests.
    // https://github.com/webcomponents/polyfills/issues/343
    return;
  }
  const root = parentNode.getRootNode();
  if (root === document) {
    // Parts in the document scope would never have any effect. Return early so
    // we don't waste time querying it.
    return;
  }
  const host = root.host;
  if (!host) {
    // If there's no host, we're not connected, so no part styles could apply
    // here.
    return;
  }
  let parts;
  // TODO(aomarks) We should be able to get much better performance over the
  // querySelectorAll calls here by integrating the part check into the walk
  // that ShadyDOM already does to find slots.
  // https://github.com/webcomponents/polyfills/issues/345
  if (newNode instanceof DocumentFragment) {
    // E.g. a template stamp. Note this call occurs before the native insert, so
    // DocumentFragment children are still contained by newNode.
    parts = newNode.querySelectorAll('[part]');
  } else if (newNode instanceof Text) {
    // E.g. an innerHTML assignment.
    parts = parentNode.querySelectorAll('[part]');
  } else {
    parts = newNode.querySelectorAll('[part]');
    // querySelectorAll doesn't match the parent node itself.
    if (newNode.hasAttribute('part')) {
      parts = [newNode, ...parts];
    }
  }
  if (parts.length === 0) {
    return;
  }
  const receiverScope = host.localName;
  const superRoot = host.getRootNode();
  const providerScope =
    superRoot === document ? 'document' : superRoot.host.localName;
  for (const part of parts) {
    part.setAttribute(
      'shady-part',
      formatShadyPartAttribute(
        providerScope,
        receiverScope,
        part.getAttribute('part')
      )
    );
  }
}
