const reservedTagList = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
]);

function isValidCustomElementName(name) {
  const reserved = reservedTagList.has(name);
  const validForm = /^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(name);
  return !reserved && validForm;
}

class CustomElementRegistry {
  constructor() {
    console.log('CustomElementRegistry constructed');

    /** @type {!Map<string, !Object>} */
    this._definitions = new Map();

    /** @type {boolean} */
    this._elementDefinitionIsRunning = false;
  }

  /**
   * @param {string} name
   * @param {!Function} constructor
   */
  define(name, constructor) {
    console.log('customElements.define', name);

    if (!(constructor instanceof Function)) {
      throw new TypeError('Custom element constructors must be functions.');
    }

    if (!isValidCustomElementName(name)) {
      throw new SyntaxError(`The element name '${name}' is not valid.`);
    }

    if (this._definitions.has(name)) {
      throw new Error(`A custom element with name '${name}' has already been defined.`);
    }

    const localName = name;

    if (this._elementDefinitionIsRunning) {
      throw new Error('A custom element is already being defined.');
    }
    this._elementDefinitionIsRunning = true;

    let connectedCallback;
    let disconnectedCallback;
    let adoptedCallback;
    let attributeChangedCallback;
    let observedAttributes;
    try {
      /** @type {!Object} */
      const prototype = constructor.prototype;
      if (!(prototype instanceof Object)) {
        throw new TypeError('The custom element constructor\'s prototype is not an object.');
      }

      function getCallback(name) {
        const callbackValue = prototype[name];
        if (callbackValue !== undefined && !(callbackValue instanceof Function)) {
          throw new Error(`The '${name}' callback must be a function.`);
        }
        return callbackValue;
      }

      connectedCallback = getCallback('connectedCallback');
      disconnectedCallback = getCallback('disconnectedCallback');
      adoptedCallback = getCallback('adoptedCallback');
      attributeChangedCallback = getCallback('attributeChangedCallback');
      observedAttributes = constructor.observedAttributes || [];
    } catch (e) {
      return;
    } finally {
      this._elementDefinitionIsRunning = false;
    }

    const definition = {
      name,
      localName,
      constructor,
      connectedCallback,
      disconnectedCallback,
      adoptedCallback,
      attributeChangedCallback,
      observedAttributes,
    };

    this._definitions.set(name, definition);

    // TODO(bicknellr): Upgrade elements matching this definition.

    // TODO(bicknellr): whenDefined promise map
  }
}

// Closure compiler exports.
CustomElementRegistry.prototype['define'] = CustomElementRegistry.prototype.define;

export default CustomElementRegistry;
