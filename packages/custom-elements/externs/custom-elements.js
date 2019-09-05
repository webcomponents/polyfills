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

/** @type {boolean|undefined} */
CustomElementRegistry.prototype.noDocumentConstructionObserver;

/** @type {boolean|undefined} */
CustomElementRegistry.prototype.shadyDomFastWalk;

/** @type {!Function|undefined} */
CustomElementRegistry.prototype.polyfillWrapFlushCallback;

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

/** @type {!CustomElementRegistry|undefined} */
Node.prototype.__CE_registry;

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

// Note, the closure type is incorrect here.
/** @type {!HTMLCollection} */
DocumentFragment.prototype.children;

/**
 * Non-standard Safari property.
 * @type {string|undefined}
 */
Error.prototype.sourceURL;

/**
 * Non-standard Safari property.
 * @type {number|undefined}
 */
Error.prototype.line;

/**
 * Non-standard Safari property.
 * @type {number|undefined}
 */
Error.prototype.column;

/**
 * Non-standard Firefox property.
 * @type {number|undefined}
 */
Error.prototype.columnNumber;

/**
 * Used by IE to configure ErrorEvents.
 * @see https://docs.microsoft.com/en-us/openspecs/ie_standards/ms-html5e/30b18240-7be6-4379-9e0a-262c99ed9529
 * @type {undefined|!function(string, boolean, boolean, string, string, number)}
 */
ErrorEvent.prototype.initErrorEvent;
