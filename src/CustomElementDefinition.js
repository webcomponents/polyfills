import AlreadyConstructedMarker from './AlreadyConstructedMarker';

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
export let CustomElementDefinition;
