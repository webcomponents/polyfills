let counter = 0;

const leftPad = (number, size = 5) => {
  let s = String(number);

  while (s.length < size) {
    s = '0' + s;
  }

  return s;
};

/**
 * Creates a unique test tag name.
 * @return {string}
 */
export const getTestTagName = () => {
  counter += 1;

  return `test-${leftPad(counter)}`;
};

/**
 * Creates a test element and a unique tag name.
 *
 * @return {{Klass: typeof HTMLElement, tagName: string}}
 */
export const getTestElement = () => ({
  tagName: getTestTagName(),
  CustomElementClass: class extends HTMLElement {},
});

/**
 * Gets a shadowRoot with a registry associated.
 *
 * @param {CustomElementRegistry} [customElementRegistry]
 * @return {ShadowRoot}
 */
export const getShadowRoot = (customElementRegistry) => {
  const tagName = getTestTagName();
  const CustomElementClass = class extends HTMLElement {
    constructor() {
      super();

      const initOptions = {
        mode: 'open',
      };

      if (customElementRegistry) {
        initOptions.customElements = customElementRegistry;
      }

      this.attachShadow(initOptions);
    }
  };

  window.customElements.define(tagName, CustomElementClass);

  const {shadowRoot} = new CustomElementClass();

  return shadowRoot;
};

/**
 * Creates an HTML node from a text. If the text contains several nodes at first level, returns the first one.
 *
 * @param {string} html
 * @param {Document|ShadowRoot} root
 * @return {HTMLElement}
 */
export const getHTML = (html, root = document) => {
  const div = root.createElement('div');

  div.innerHTML = html;

  return /** @type {HTMLElement} */ div.firstElementChild;
};

/**
 * Creates a template element with the specified html content.
 *
 * @param {string} html - template's content
 * @return {HTMLTemplateElement}
 */
export const createTemplate = (html) => {
  const template = document.createElement('template');

  template.innerHTML = html;

  return template;
};
