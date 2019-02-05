/**
 * @externs
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

/** @type {boolean|undefined} */
CustomElementRegistry.prototype.forcePolyfill;

class AlreadyConstructedMarkerType {}

/**
 * @typedef {{
 *  localName: string,
 *  constructorFunction: !Function,
 *  connectedCallback: Function,
 *  disconnectedCallback: Function,
 *  adoptedCallback: Function,
 *  attributeChangedCallback: Function,
 *  observedAttributes: !Array<string>,
 *  constructionStack: !Array<!HTMLElement|!AlreadyConstructedMarkerType>,
 * }}
 */
let CustomElementDefinition;


// These properties are defined in the closure externs so that they will not be
// renamed during minification.

// Used for both Documents and Nodes which represent documents in the HTML
// Imports polyfill.

/** @type {boolean|undefined} */
Node.prototype.__CE_hasRegistry;

/** @type {boolean|undefined} */
Node.prototype.__CE_isImportDocument;

/** @type {boolean|undefined} */
Node.prototype.__CE_documentLoadHandled;

// Apply generally to Node.

/** @type {boolean|undefined} */
Node.prototype.__CE_patched;

/** @type {string} */
Node.prototype.readyState;

// Apply generally to Element.

/** @type {number|undefined} */
Element.prototype.__CE_state;

/** @type {!CustomElementDefinition|undefined} */
Element.prototype.__CE_definition;

/** @type {!DocumentFragment|undefined} */
Element.prototype.__CE_shadowRoot;
