var CustomElementRegistry;
CustomElementRegistry.prototype.forcePolyfill = false;

class AlreadyConstructedMarker {}

/**
 * @enum {number}
 */
const CustomElementState = {
  custom: 1,
  failed: 2,
};

/**
 * @typedef {{
 *  localName: string,
 *  constructor: !Function,
 *  connectedCallback: Function,
 *  disconnectedCallback: Function,
 *  adoptedCallback: Function,
 *  attributeChangedCallback: Function,
 *  observedAttributes: !Array<string>,
 *  constructionStack: !Array<!HTMLElement|!AlreadyConstructedMarker>,
 * }}
 */
let CustomElementDefinition;


// These properties are defined in the closure externs so that they will not be
// renamed during minification.

/** @type {boolean|undefined} */
Node.prototype.__CE_patched;

/** @type {boolean|undefined} */
Node.prototype.__CE_documentLoadHandled;

/** @type {CustomElementState|undefined} */
Element.prototype.__CE_state;

/** @type {CustomElementDefinition|undefined} */
Element.prototype.__CE_definition;

/** @type {DocumentFragment|undefined} */
Element.prototype.__CE_shadowRoot;
