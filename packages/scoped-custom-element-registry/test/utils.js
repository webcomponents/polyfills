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
    attributeChanges = [];
    attributeChangedCallback(name, old, value) {
      this.attributeChanges.push({name, old, value});
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
  const el = document.createElement('div');
  return el.attachShadow({mode: 'open', customElements: customElementRegistry});
};

/**
 * Gets a shadowRoot with a null registry associated.
 *
 * @return {ShadowRoot}
 */
export const getUnitializedShadowRoot = () => {
  const el = document.createElement('div');
  return el.attachShadow({mode: 'open', customElements: null});
};

/**
 * Creates an HTML node from a text. If the text contains several nodes at first level, returns the first one.
 *
 * @param {string} html
 * @param {Document|ShadowRoot} root
 * @return {HTMLElement}
 */
export const getHTML = (html, root = document) => {
  const div = document.createElement('div', {
    customElements: root.customElements,
  });

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
