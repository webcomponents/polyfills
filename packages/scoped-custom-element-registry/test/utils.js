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
 *
 * @param {Array<string>} observedAttributeNames the names of the attributes you want to observe
 * @returns {{CustomElementClass: typeof HTMLElement, tagName: string}}
 */
export const getObservedAttributesTestElement = (
  observedAttributeNames = []
) => ({
  tagName: getTestTagName(),
  CustomElementClass: class extends HTMLElement {
    static get observedAttributes() {
      return observedAttributeNames;
    }

    /** @type {{ name: string, oldValue: string|null, newValue: string|null}[]} */
    changedAttributes = [];

    attributeChangedCallback(name, oldValue, newValue) {
      this.changedAttributes.push({name, oldValue, newValue});
    }
  },
});

export const getFormAssociatedTestElement = () => ({
  tagName: getTestTagName(),
  CustomElementClass: class extends HTMLElement {
    static get formAssociated() {
      return true;
    }
    constructor() {
      super();
      this.internals = this.attachInternals();
      this.internals.setFormValue('FACE');
    }
  },
});

export const getFormAssociatedErrorTestElement = () => ({
  tagName: getTestTagName(),
  CustomElementClass: class extends HTMLElement {
    internals = this.attachInternals();
    constructor() {
      super();
      this.internals.setFormValue('FACE');
    }
  },
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
