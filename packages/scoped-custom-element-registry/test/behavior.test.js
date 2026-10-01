import {expect} from '@open-wc/testing';
import '../scoped-custom-element-registry.min.js';
import {getTestTagName, itWithPolyfill} from './utils.js';

// Defines a tag in a registry with a class that records upgrades and
// lifecycle callbacks.
const defineLogged = (registry, tagName = getTestTagName()) => {
  const log = [];
  class Logged extends HTMLElement {
    static observedAttributes = ['v'];
    constructor() {
      super();
      log.push('constructed');
    }
    connectedCallback() {
      log.push('connected');
    }
    disconnectedCallback() {
      log.push('disconnected');
    }
    attributeChangedCallback(_n, _o, v) {
      log.push(`attr:${v}`);
    }
  }
  registry.define(tagName, Logged);
  return {tagName, Logged, log};
};

// Runs `fn`, capturing errors reported as uncaught (e.g. from a constructor
// during `innerHTML`) so they don't fail the test run.
const captureReportedErrors = (fn) => {
  const errors = [];
  // Note, the test runner reports uncaught errors via `window.onerror`.
  const {onerror} = window;
  window.onerror = (_message, _source, _line, _column, error) => {
    errors.push(error);
    return true;
  };
  try {
    fn();
  } finally {
    window.onerror = onerror;
  }
  return errors;
};

const inertDocument = () =>
  document.createElement('template').content.ownerDocument;

describe('Creation', () => {
  it('uses the document registry by default, which is null for an inert document', () => {
    expect(document.createElement('div').customElementRegistry).to.equal(
      customElements
    );
    expect(
      document.implementation.createHTMLDocument().createElement('div')
        .customElementRegistry
    ).to.be.null;
  });

  it('throws for `is` together with a registry', () => {
    expect(() =>
      document.createElement('div', {
        is: 'x-y',
        customElementRegistry: new CustomElementRegistry(),
      })
    ).to.throw(DOMException, /./);
  });

  it("throws for a global registry that isn't the document's", () => {
    const doc = document.implementation.createHTMLDocument();
    expect(() =>
      doc.createElement('div', {customElementRegistry: customElements})
    ).to.throw(DOMException);
  });

  it('importNode uses the document registry by default, or the given one', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(registry);
    const template = document.createElement('template');
    template.innerHTML = `<${tagName}></${tagName}>`;
    expect(
      document.importNode(template.content, true).firstChild
        .customElementRegistry
    ).to.equal(customElements);
    const el = document.importNode(template.content, {
      customElementRegistry: registry,
    }).firstChild;
    expect(el.customElementRegistry).to.equal(registry);
    expect(el).to.be.instanceOf(Logged);
  });
});

describe('importNode', () => {
  it('is shallow by default', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span></span>';
    expect(document.importNode(el).childNodes.length).to.equal(0);
    expect(document.importNode(el, {}).childNodes.length).to.equal(1);
  });
});

describe('Registry API', () => {
  it('define returns undefined', () => {
    expect(
      new CustomElementRegistry().define(
        getTestTagName(),
        class extends HTMLElement {}
      )
    ).to.be.undefined;
  });

  it('define rejects invalid names and stays usable', () => {
    const registry = new CustomElementRegistry();
    expect(() =>
      registry.define('Bad-Name', class extends HTMLElement {})
    ).to.throw();
    expect(() =>
      registry.define(getTestTagName(), class extends HTMLElement {})
    ).not.to.throw();
  });

  it('define rejects a used name or constructor with a NotSupportedError', () => {
    const registry = new CustomElementRegistry();
    const tagName = getTestTagName();
    const Element = class extends HTMLElement {};
    registry.define(tagName, Element);
    expect(() => registry.define(tagName, class extends HTMLElement {}))
      .to.throw(DOMException)
      .with.property('name', 'NotSupportedError');
    expect(() => registry.define(getTestTagName(), Element))
      .to.throw(DOMException)
      .with.property('name', 'NotSupportedError');
  });

  it('define with an invalid name leaves the class unchanged', () => {
    class Element extends HTMLElement {
      static observedAttributes = ['a'];
      attributeChangedCallback() {}
    }
    const ownNames = () =>
      [
        ...Object.getOwnPropertyNames(Element),
        ...Object.getOwnPropertyNames(Element.prototype),
      ].sort();
    const before = ownNames();
    expect(() => customElements.define('nodash', Element)).to.throw();
    expect(ownNames()).to.deep.equal(before);
  });

  it('define throws a NotSupportedError while another definition is running', () => {
    const registry = new CustomElementRegistry();
    const innerTag = getTestTagName();
    let innerError;
    class Element extends HTMLElement {}
    Object.defineProperty(Element.prototype, 'connectedCallback', {
      get() {
        try {
          registry.define(innerTag, class extends HTMLElement {});
        } catch (e) {
          innerError = e;
        }
        return undefined;
      },
    });
    registry.define(getTestTagName(), Element);
    expect(innerError?.name).to.equal('NotSupportedError');
    expect(registry.get(innerTag)).to.be.undefined;
  });

  it('define rejects a non-constructor with a TypeError', () => {
    const notConstructor = () => {};
    notConstructor.prototype = Object.create(HTMLElement.prototype);
    expect(() =>
      customElements.define(getTestTagName(), notConstructor)
    ).to.throw(TypeError);
  });

  it('define checks the constructor, then the name, before reading the class', () => {
    const notConstructor = () => {};
    notConstructor.prototype = {};
    expect(() => customElements.define('nodash', notConstructor)).to.throw(
      TypeError
    );
    let read = false;
    class Element extends HTMLElement {
      static get observedAttributes() {
        read = true;
        return [];
      }
    }
    expect(() => customElements.define('nodash', Element))
      .to.throw(DOMException)
      .with.property('name', 'SyntaxError');
    expect(read).to.be.false;
  });

  it('define reads observedAttributes only when there is an attributeChangedCallback', () => {
    class Element extends HTMLElement {
      static get observedAttributes() {
        throw new Error('read');
      }
    }
    expect(() =>
      customElements.define(getTestTagName(), Element)
    ).not.to.throw();
  });

  it('define reads the form callbacks only for a form-associated class', () => {
    let read = false;
    class Element extends HTMLElement {}
    Object.defineProperty(Element.prototype, 'formResetCallback', {
      get() {
        read = true;
        return undefined;
      },
    });
    customElements.define(getTestTagName(), Element);
    expect(read).to.be.false;
  });

  it('define captures disabledFeatures', () => {
    const tagName = getTestTagName();
    class Element extends HTMLElement {}
    customElements.define(tagName, Element);
    Element.disabledFeatures = ['shadow', 'internals'];
    const element = document.createElement(tagName);
    expect(() => element.attachShadow({mode: 'open'})).not.to.throw();
    expect(() => element.attachInternals()).not.to.throw();
  });

  it('define throws if reading disabledFeatures throws', () => {
    class Element extends HTMLElement {
      static get disabledFeatures() {
        throw new Error('disabledFeatures');
      }
    }
    expect(() => customElements.define(getTestTagName(), Element)).to.throw(
      'disabledFeatures'
    );
  });

  // Note, Chromium defines it, but the spec says to throw.
  itWithPolyfill(
    'a scoped registry rejects extends with a NotSupportedError',
    () => {
      const registry = new CustomElementRegistry();
      expect(() =>
        registry.define(getTestTagName(), class extends HTMLButtonElement {}, {
          extends: 'button',
        })
      )
        .to.throw(DOMException)
        .with.property('name', 'NotSupportedError');
    }
  );

  it('the global registry defines customized built-in elements', async () => {
    const tagName = getTestTagName();
    class Button extends HTMLButtonElement {}
    customElements.define(tagName, Button, {extends: 'button'});
    expect(document.createElement('button', {is: tagName})).to.be.instanceOf(
      Button
    );
    const container = document.createElement('div');
    container.innerHTML = `<button is="${tagName}"></button>`;
    expect(container.firstChild).to.be.instanceOf(Button);
    expect(customElements.get(tagName)).to.equal(Button);
    expect(customElements.getName(Button)).to.equal(tagName);
    expect(await customElements.whenDefined(tagName)).to.equal(Button);
  });

  it('a customized built-in upgraded by define can look up its definition and define another', () => {
    const tagName = getTestTagName();
    const otherTag = getTestTagName();
    const container = document.createElement('div');
    container.innerHTML = `<button is="${tagName}"></button>`;
    document.body.append(container);
    let found;
    class Button extends HTMLButtonElement {
      constructor() {
        super();
        found = customElements.get(tagName);
        customElements.define(otherTag, class extends HTMLElement {});
      }
    }
    customElements.define(tagName, Button, {extends: 'button'});
    expect(found).to.equal(Button);
    expect(customElements.get(otherTag)).not.to.be.undefined;
    container.remove();
  });

  it("define rejects a callback that isn't callable with a TypeError", () => {
    class Element extends HTMLElement {}
    Element.prototype.connectedCallback = 1;
    expect(() => customElements.define(getTestTagName(), Element)).to.throw(
      TypeError
    );
    class FormElement extends HTMLElement {
      static formAssociated = true;
    }
    FormElement.prototype.formResetCallback = 'reset';
    expect(() => customElements.define(getTestTagName(), FormElement)).to.throw(
      TypeError
    );
  });

  it("define rejects observedAttributes or disabledFeatures that aren't iterable", () => {
    const withObserved = (observedAttributes) =>
      class extends HTMLElement {
        static observedAttributes = observedAttributes;
        attributeChangedCallback() {}
      };
    expect(() =>
      customElements.define(getTestTagName(), withObserved({0: 'a', length: 1}))
    ).to.throw(TypeError);
    expect(() =>
      customElements.define(getTestTagName(), withObserved('ab'))
    ).to.throw(TypeError);
    expect(() =>
      customElements.define(
        getTestTagName(),
        class extends HTMLElement {
          static disabledFeatures = {0: 'shadow', length: 1};
        }
      )
    ).to.throw(TypeError);
  });

  it("define rejects a class whose prototype isn't an object with a TypeError", () => {
    const notAnObject = function () {};
    notAnObject.prototype = 5;
    expect(() => customElements.define(getTestTagName(), notAnObject)).to.throw(
      TypeError
    );
  });

  it('define reads the class in the specified order', () => {
    const read = [];
    class Element extends HTMLElement {}
    const prototypeNames = [
      'connectedCallback',
      'disconnectedCallback',
      'connectedMoveCallback',
      'adoptedCallback',
      'attributeChangedCallback',
      'formAssociatedCallback',
      'formResetCallback',
      'formDisabledCallback',
      'formStateRestoreCallback',
    ];
    for (const name of prototypeNames) {
      Object.defineProperty(Element.prototype, name, {
        get() {
          read.push(name);
          return name === 'attributeChangedCallback' ? () => {} : undefined;
        },
      });
    }
    for (const name of [
      'observedAttributes',
      'disabledFeatures',
      'formAssociated',
    ]) {
      Object.defineProperty(Element, name, {
        get() {
          read.push(name);
          return name === 'formAssociated' ? true : undefined;
        },
      });
    }
    customElements.define(getTestTagName(), Element);
    expect(read).to.deep.equal([
      'connectedCallback',
      'disconnectedCallback',
      'connectedMoveCallback',
      'adoptedCallback',
      'attributeChangedCallback',
      'observedAttributes',
      'disabledFeatures',
      'formAssociated',
      'formAssociatedCallback',
      'formResetCallback',
      'formDisabledCallback',
      'formStateRestoreCallback',
    ]);
  });

  it('define checks extends before reading the class', () => {
    class Element extends HTMLElement {
      static get observedAttributes() {
        throw new Error('read');
      }
      attributeChangedCallback() {}
    }
    for (const extendsName of ['x-custom', 'unknown']) {
      expect(() =>
        customElements.define(getTestTagName(), Element, {
          extends: extendsName,
        })
      )
        .to.throw(DOMException)
        .with.property('name', 'NotSupportedError');
    }
  });

  it("a customized built-in isn't defined while its class is being read", async () => {
    const tagName = getTestTagName();
    let during;
    let whenDefined;
    class Button extends HTMLButtonElement {
      static get observedAttributes() {
        during = customElements.get(tagName);
        whenDefined = customElements.whenDefined(tagName);
        throw new Error('observedAttributes');
      }
      attributeChangedCallback() {}
    }
    expect(() =>
      customElements.define(tagName, Button, {extends: 'button'})
    ).to.throw('observedAttributes');
    expect(during).to.be.undefined;
    expect(customElements.get(tagName)).to.be.undefined;
    const settled = await Promise.race([
      whenDefined.then(() => 'defined'),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 20)),
    ]);
    expect(settled).to.equal('pending');
  });

  it('whenDefined rejects invalid names with a SyntaxError', async () => {
    let error;
    try {
      await new CustomElementRegistry().whenDefined('nodash');
    } catch (e) {
      error = e;
    }
    expect(error?.name).to.equal('SyntaxError');
  });

  it('initialize returns undefined and only assigns null registries', () => {
    const registry = new CustomElementRegistry();
    const container = document.createElement('div', {
      customElementRegistry: null,
    });
    const globalChild = document.createElement('div');
    container.append(globalChild);
    expect(registry.initialize(container)).to.be.undefined;
    expect(container.customElementRegistry).to.equal(registry);
    expect(globalChild.customElementRegistry).to.equal(customElements);
  });

  it('initialize works on a node in another document', () => {
    const registry = new CustomElementRegistry();
    const el = document.implementation
      .createHTMLDocument()
      .createElement('div');
    registry.initialize(el);
    expect(el.customElementRegistry).to.equal(registry);
  });

  // Note, Chromium doesn't throw, but the spec says to.
  itWithPolyfill(
    'initialize throws on the global registry for a document',
    () => {
      expect(() => customElements.initialize(document)).to.throw(DOMException);
    }
  );

  it('upgrade reaches into shadow roots', () => {
    const registry = new CustomElementRegistry();
    const tagName = getTestTagName();
    const host = document.createElement('div', {
      customElementRegistry: registry,
    });
    const root = host.attachShadow({
      mode: 'open',
      customElementRegistry: registry,
    });
    root.innerHTML = `<${tagName}></${tagName}>`;
    const {Logged} = defineLogged(registry, tagName);
    registry.upgrade(host);
    expect(root.firstChild).to.be.instanceOf(Logged);
  });
});

describe('initialize and lifecycle', () => {
  it('an initialized null element gets all later reactions', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged, log} = defineLogged(registry);
    const el = document.createElement(tagName, {customElementRegistry: null});
    registry.initialize(el);
    expect(el).to.be.instanceOf(Logged);
    log.length = 0;
    document.body.append(el);
    el.setAttribute('v', '1');
    el.remove();
    expect(log).to.deep.equal(['connected', 'attr:1', 'disconnected']);
  });
});

describe('attributeChangedCallback', () => {
  // Returns a class whose attributeChangedCallback logs `name`.
  const logAttributes = (log) =>
    class extends HTMLElement {
      attributeChangedCallback(name) {
        log.push(name);
      }
    };

  it("one class defined in two registries uses each definition's observed attributes", () => {
    const log = [];
    const Element = logAttributes(log);
    const first = new CustomElementRegistry();
    const second = new CustomElementRegistry();
    const tagName = getTestTagName();
    Element.observedAttributes = ['a'];
    first.define(tagName, Element);
    Element.observedAttributes = ['b'];
    second.define(tagName, Element);
    const fromFirst = document.createElement(tagName, {
      customElementRegistry: first,
    });
    const fromSecond = document.createElement(tagName, {
      customElementRegistry: second,
    });
    fromFirst.setAttribute('a', '');
    fromFirst.setAttribute('b', '');
    expect(log).to.deep.equal(['a']);
    log.length = 0;
    fromSecond.setAttribute('a', '');
    fromSecond.setAttribute('b', '');
    expect(log).to.deep.equal(['b']);
  });

  it('an error in one callback of an upgrade is reported, and the others still run', () => {
    const log = [];
    const tagName = getTestTagName();
    const container = document.createElement('div');
    container.innerHTML = `<${tagName} a b></${tagName}>`;
    document.body.append(container);
    const errors = captureReportedErrors(() => {
      customElements.define(
        tagName,
        class extends HTMLElement {
          static observedAttributes = ['a', 'b'];
          attributeChangedCallback(name) {
            log.push(name);
            if (name === 'a') {
              throw new Error('a');
            }
          }
          connectedCallback() {
            log.push('connected');
          }
        }
      );
    });
    expect(log).to.deep.equal(['a', 'b', 'connected']);
    expect(errors.length).to.equal(1);
    container.remove();
  });

  it('setAttribute reports an error in the callback instead of throwing it', () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        static observedAttributes = ['a'];
        attributeChangedCallback() {
          throw new Error('callback');
        }
      }
    );
    const element = document.createElement(tagName);
    const errors = captureReportedErrors(() => element.setAttribute('a', ''));
    expect(errors.length).to.equal(1);
  });

  it("a subclass uses only its own definition's observed attributes", () => {
    const log = [];
    const Base = logAttributes(log);
    Base.observedAttributes = ['a'];
    customElements.define(getTestTagName(), Base);
    class Derived extends Base {
      static observedAttributes = ['b'];
    }
    const tagName = getTestTagName();
    customElements.define(tagName, Derived);
    const element = document.createElement(tagName);
    element.setAttribute('a', '');
    element.setAttribute('b', '');
    element.removeAttribute('b');
    element.removeAttribute('b');
    element.toggleAttribute('b');
    expect(log).to.deep.equal(['b', 'b', 'b']);
  });
});

describe('Cloning', () => {
  it('a deep clone of a template keeps its content; a shallow one does not', () => {
    const template = document.createElement('template');
    template.innerHTML = '<p>x</p>';
    expect(template.cloneNode(true).content.childNodes.length).to.equal(1);
    expect(template.cloneNode(false).content.childNodes.length).to.equal(0);
  });

  it('keeps each node\u2019s registry in a mixed tree', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(registry);
    const outer = document.createElement('div', {
      customElementRegistry: registry,
    });
    outer.append(
      document.createElement(tagName, {customElementRegistry: registry}),
      document.createElement('div')
    );
    const copy = outer.cloneNode(true);
    expect(copy.children[0].customElementRegistry).to.equal(registry);
    expect(copy.children[0]).to.be.instanceOf(Logged);
    expect(copy.children[1].customElementRegistry).to.equal(customElements);
  });

  for (const mode of ['open', 'closed']) {
    it(`clones an imperative ${mode} clonable root with its registry`, () => {
      const registry = new CustomElementRegistry();
      const {tagName, log} = defineLogged(registry);
      const host = document.createElement('div');
      const root = host.attachShadow({
        mode,
        clonable: true,
        customElementRegistry: registry,
      });
      root.innerHTML = `<${tagName}></${tagName}>`;
      log.length = 0;
      const copy = host.cloneNode(true);
      expect(log).to.deep.equal(['constructed']);
      if (mode === 'open') {
        expect(copy.shadowRoot.customElementRegistry).to.equal(registry);
      }
    });
  }

  // Note, the tag is defined both globally and in the root's registry, so a
  // copy given the wrong registry upgrades with the wrong definition.
  const cloners = {
    cloneNode: (host) => host.cloneNode(true),
    importNode: (host) => document.importNode(host, true),
    'Range.cloneContents': (host) => {
      const container = document.createElement('div');
      container.append(host);
      const range = document.createRange();
      range.selectNode(host);
      return range.cloneContents().firstChild;
    },
  };
  // Note, a built-in host (div) and a custom element host that isn't defined
  // when the root is attached take different paths.
  const hostNames = {
    'built-in host': () => 'div',
    'custom element host': getTestTagName,
  };
  for (const [cloneName, clone] of Object.entries(cloners)) {
    for (const [hostKind, hostName] of Object.entries(hostNames)) {
      it(`${cloneName} of a closed root on a ${hostKind} uses the root's definition`, () => {
        const tagName = getTestTagName();
        const log = [];
        const registry = new CustomElementRegistry();
        registry.define(
          tagName,
          class extends HTMLElement {
            constructor() {
              super();
              log.push('scoped');
            }
          }
        );
        customElements.define(
          tagName,
          class extends HTMLElement {
            constructor() {
              super();
              log.push('global');
            }
          }
        );
        const host = document.createElement(hostName());
        host.attachShadow({
          mode: 'closed',
          clonable: true,
          customElementRegistry: registry,
        }).innerHTML = `<${tagName}></${tagName}>`;
        log.length = 0;
        clone(host);
        expect(log).to.deep.equal(['scoped']);
      });
    }
  }

  it('clones nested roots with a registry per level', () => {
    const outerRegistry = new CustomElementRegistry();
    const innerRegistry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(innerRegistry);
    const outer = document.createElement('div');
    const outerRoot = outer.attachShadow({
      mode: 'open',
      clonable: true,
      customElementRegistry: outerRegistry,
    });
    const inner = document.createElement('div');
    inner.attachShadow({
      mode: 'open',
      clonable: true,
      customElementRegistry: innerRegistry,
    }).innerHTML = `<${tagName}></${tagName}>`;
    outerRoot.append(inner);
    const copy = outer.cloneNode(true);
    const copyInner = copy.shadowRoot.firstChild;
    expect(copy.shadowRoot.customElementRegistry).to.equal(outerRegistry);
    expect(copyInner.shadowRoot.customElementRegistry).to.equal(innerRegistry);
    expect(copyInner.shadowRoot.firstChild).to.be.instanceOf(Logged);
  });

  it("a cloned template's contents keep their registries", () => {
    const registry = new CustomElementRegistry();
    const template = document.createElement('template');
    template.content.append(
      document.createElement('span', {customElementRegistry: registry}),
      document.createElement('span')
    );
    const copy = template.cloneNode(true);
    const registries = (content) =>
      [...content.children].map((child) => child.customElementRegistry);
    expect(registries(copy.content)).to.deep.equal(
      registries(template.content)
    );
    expect(copy.content.firstChild.customElementRegistry).to.equal(registry);
  });

  it("importNode's registry doesn't apply to a template's contents", () => {
    const registry = new CustomElementRegistry();
    const template = document.createElement('template');
    template.innerHTML = '<x-example></x-example>';
    const copy = document.importNode(template, {
      customElementRegistry: registry,
    });
    expect(copy.content.firstElementChild.customElementRegistry).to.equal(
      template.content.firstElementChild.customElementRegistry
    );
  });

  // Note, Chromium gives the copy a null registry, but the spec says to keep a
  // scoped one.
  itWithPolyfill(
    'a cloned document keeps its scoped registry, deep or shallow',
    () => {
      const registry = new CustomElementRegistry();
      const doc = document.implementation.createHTMLDocument();
      registry.initialize(doc);
      expect(doc.cloneNode(true).customElementRegistry).to.equal(registry);
      expect(doc.cloneNode(false).customElementRegistry).to.equal(registry);
    }
  );

  it("a cloned document's elements keep their scoped registry", () => {
    const registry = new CustomElementRegistry();
    const doc = document.implementation.createHTMLDocument();
    registry.initialize(doc);
    expect(doc.cloneNode(true).body.customElementRegistry).to.equal(registry);
  });

  it("a cloned document's elements get its registry", () => {
    const copy = document.cloneNode(true);
    expect(copy.body.customElementRegistry).to.equal(
      copy.customElementRegistry
    );
  });

  it('Range.extractContents copies a partially selected element with its registry', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(registry);
    const outer = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    outer.append('ab');
    document.body.append(outer);
    const range = document.createRange();
    range.setStart(outer.firstChild, 1);
    range.setEndAfter(outer);
    const copy = range.extractContents().firstChild;
    expect(copy.customElementRegistry).to.equal(registry);
    expect(copy).to.be.instanceOf(Logged);
    outer.remove();
  });

  it('a closed root copied on a built-in host is paired before constructors can change its source', () => {
    const log = [];
    const tagName = getTestTagName();
    const registry = new CustomElementRegistry();
    for (const [name, target] of [
      ['scoped', registry],
      ['global', customElements],
    ]) {
      target.define(
        tagName,
        class extends HTMLElement {
          constructor() {
            super();
            log.push(name);
          }
        }
      );
    }
    const host = document.createElement('div');
    const root = host.attachShadow({mode: 'closed', clonable: true});
    root.append(
      document.createElement(tagName, {customElementRegistry: registry})
    );
    let mutate = false;
    const mutatorTag = getTestTagName();
    customElements.define(
      mutatorTag,
      class extends HTMLElement {
        constructor() {
          super();
          if (mutate) {
            mutate = false;
            root.replaceChildren(document.createElement(tagName));
          }
        }
      }
    );
    const container = document.createElement('div');
    container.append(document.createElement(mutatorTag), host);
    mutate = true;
    log.length = 0;
    container.cloneNode(true);
    // Note, the replacement in the source logs 'global'; the copy gets its
    // source's 'scoped'.
    expect(log).to.deep.equal(['global', 'scoped']);
  });

  // Note, Chromium gives the copy the document's scoped registry, but the spec
  // says a scoped registry's effective global registry is null.
  itWithPolyfill(
    'a global registry becomes null in a document with a scoped registry',
    () => {
      const registry = new CustomElementRegistry();
      const doc = document.implementation.createHTMLDocument();
      registry.initialize(doc);
      const copy = doc.importNode(document.createElement('div'));
      expect(copy.customElementRegistry).to.be.null;
    }
  );

  it('a closed root nested in another, both on built-in hosts, is paired', () => {
    const log = [];
    const tagName = getTestTagName();
    const outerRegistry = new CustomElementRegistry();
    const innerRegistry = new CustomElementRegistry();
    for (const [name, registry] of [
      ['inner', innerRegistry],
      ['global', customElements],
    ]) {
      registry.define(
        tagName,
        class extends HTMLElement {
          constructor() {
            super();
            log.push(name);
          }
        }
      );
    }
    const outer = document.createElement('div');
    const outerRoot = outer.attachShadow({
      mode: 'closed',
      clonable: true,
      customElementRegistry: outerRegistry,
    });
    const inner = document.createElement('div');
    outerRoot.append(inner);
    inner
      .attachShadow({
        mode: 'closed',
        clonable: true,
        customElementRegistry: innerRegistry,
      })
      .append(
        document.createElement(tagName, {customElementRegistry: innerRegistry})
      );
    log.length = 0;
    outer.cloneNode(true);
    expect(log).to.deep.equal(['inner']);
  });

  it('an open root nested in a closed root on a built-in host is paired', () => {
    const log = [];
    const tagName = getTestTagName();
    const innerRegistry = new CustomElementRegistry();
    for (const [name, registry] of [
      ['inner', innerRegistry],
      ['global', customElements],
    ]) {
      registry.define(
        tagName,
        class extends HTMLElement {
          constructor() {
            super();
            log.push(name);
          }
        }
      );
    }
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    outer.attachShadow({mode: 'closed', clonable: true}).append(inner);
    inner
      .attachShadow({
        mode: 'open',
        clonable: true,
        customElementRegistry: innerRegistry,
      })
      .append(
        document.createElement(tagName, {customElementRegistry: innerRegistry})
      );
    log.length = 0;
    outer.cloneNode(true);
    expect(log).to.deep.equal(['inner']);
  });

  it("doesn't clone a root that isn't clonable", () => {
    const host = document.createElement('div');
    host.attachShadow({mode: 'open'}).innerHTML = '<span></span>';
    expect(host.cloneNode(true).shadowRoot).to.be.null;
  });

  // Mixed registries, nested in different orders. A chain like
  // 'A > [root B] > null' is a nesting, outermost first: each part is an
  // element with that registry, or a shadow root with that registry on the
  // element before it. Every element is the same tag, defined in A, B and the
  // global registry, and each definition logs its registry's name when
  // constructed. So the log of a clone reads like the chain, minus the null
  // elements, which are never constructed.
  //
  // Together the chains cover every parent/child pair of different element
  // registries, and each registry as a root under a host with another one.
  const chains = [
    'global > A > null > B',
    'null > A > global > B',
    'A > B > global > null > A',
    'B > A > null > global > B > null',
    'A > [root B] > global > [root A] > null',
    'null > [root global] > B > [root null] > A',
  ];

  // Builds the chain, returning its outermost element and the log.
  const buildChain = (chain, rootMode) => {
    const tagName = getTestTagName();
    const log = [];
    const registries = {
      A: new CustomElementRegistry(),
      B: new CustomElementRegistry(),
      global: customElements,
      null: null,
    };
    for (const name of ['A', 'B', 'global']) {
      registries[name].define(
        tagName,
        class extends HTMLElement {
          constructor() {
            super();
            log.push(name);
          }
        }
      );
    }
    let outermost;
    let parent;
    for (const part of chain.split(' > ')) {
      const root = part.match(/^\[root (\w+)\]$/);
      if (root) {
        parent = parent.attachShadow({
          mode: rootMode,
          clonable: true,
          customElementRegistry: registries[root[1]],
        });
      } else {
        const element = document.createElement(tagName, {
          customElementRegistry: registries[part],
        });
        if (parent) {
          parent.append(element);
        } else {
          outermost = element;
        }
        parent = element;
      }
    }
    log.length = 0;
    return {outermost, log};
  };

  // The expected log: the chain's elements, minus the null ones. Except
  // importNode gives a null element the document's registry, unless it's
  // inside a shadow root (the clone doesn't pass that fallback into roots).
  const expectedLog = (chain, cloneName, placeName) => {
    let inRoot = placeName !== 'light DOM';
    const log = [];
    for (const part of chain.split(' > ')) {
      if (part.startsWith('[')) {
        inRoot = true;
      } else if (part !== 'null') {
        log.push(part);
      } else if (cloneName === 'importNode' && !inRoot) {
        log.push('global');
      }
    }
    return log;
  };

  // Where the chain is put before cloning: its roots use the same mode.
  const placements = {
    'light DOM': {
      rootMode: 'open',
      place: (node) => {
        const container = document.createElement('div');
        container.append(node);
        return container;
      },
    },
    'an open root': {
      rootMode: 'open',
      place: (node) => {
        const host = document.createElement('div');
        host.attachShadow({mode: 'open', clonable: true}).append(node);
        return host;
      },
    },
    'a closed root': {
      rootMode: 'closed',
      place: (node) => {
        const host = document.createElement('div');
        host.attachShadow({mode: 'closed', clonable: true}).append(node);
        return host;
      },
    },
  };

  for (const chain of chains) {
    for (const [placeName, {rootMode, place}] of Object.entries(placements)) {
      for (const [cloneName, clone] of Object.entries(cloners)) {
        it(`${cloneName} of ${chain} in ${placeName}`, () => {
          const {outermost, log} = buildChain(chain, rootMode);
          clone(place(outermost));
          expect(log).to.deep.equal(expectedLog(chain, cloneName, placeName));
        });
      }
    }
  }
  // Builds a closed clonable root on `host` with a chain of elements using
  // `registryNames`, clones it before the elements' tag is defined anywhere,
  // then defines the tag in each registry, which constructs the copies.
  // Returns the log of which registries constructed them.
  const cloneThenDefine = (host, registryNames, rootRegistryName) => {
    const tagName = getTestTagName();
    const registries = {
      A: new CustomElementRegistry(),
      B: new CustomElementRegistry(),
      global: customElements,
      null: null,
    };
    const root = host.attachShadow({
      mode: 'closed',
      clonable: true,
      customElementRegistry: registries[rootRegistryName],
    });
    let parent = root;
    for (const name of registryNames) {
      const element = document.createElement(tagName, {
        customElementRegistry: registries[name],
      });
      parent.append(element);
      parent = element;
    }
    const copy = host.cloneNode(true);
    document.body.append(copy);
    const log = [];
    for (const name of ['A', 'B', 'global']) {
      registries[name].define(
        tagName,
        class extends HTMLElement {
          constructor() {
            super();
            log.push(name);
          }
        }
      );
    }
    copy.remove();
    return log;
  };

  // Known limitation (see README, "Cloning a closed shadow root"): the copy's
  // closed root can't be reached on a host without internals, so elements
  // defined after the clone get the root's registry (here, global).
  it.skip('a closed root copied on a built-in host keeps mixed registries for elements defined later', () => {
    const host = document.createElement('div');
    const log = cloneThenDefine(host, ['A', 'null', 'global', 'B'], 'global');
    expect(log).to.deep.equal(['A', 'B', 'global']);
  });

  it("a closed root copied on a built-in host gives elements defined later the root's registry", () => {
    const host = document.createElement('div');
    expect(cloneThenDefine(host, ['A', 'A'], 'A')).to.deep.equal(['A', 'A']);
  });

  // The documented workaround: a custom element host, defined before the root
  // is attached.
  it('a closed root copied on a defined custom element host keeps mixed registries for elements defined later', () => {
    const hostName = getTestTagName();
    customElements.define(hostName, class extends HTMLElement {});
    const host = document.createElement(hostName);
    const log = cloneThenDefine(host, ['A', 'null', 'global', 'B'], 'global');
    expect(log).to.deep.equal(['A', 'B', 'global']);
  });
});

describe('Fragment parsing', () => {
  it('insertAdjacentHTML beforebegin uses the parent registry, leaving siblings alone', () => {
    const registry = new CustomElementRegistry();
    const parent = document.createElement('div', {
      customElementRegistry: registry,
    });
    const existing = document.createElement('div', {
      customElementRegistry: null,
    });
    parent.append(existing);
    existing.insertAdjacentHTML('beforebegin', '<span></span>');
    expect(parent.firstChild.customElementRegistry).to.equal(registry);
    expect(existing.customElementRegistry).to.be.null;
  });

  it('outerHTML uses the parent registry', () => {
    const registry = new CustomElementRegistry();
    const parent = document.createElement('div', {
      customElementRegistry: registry,
    });
    const child = document.createElement('div');
    parent.append(child);
    child.outerHTML = '<span></span>';
    expect(parent.firstChild.customElementRegistry).to.equal(registry);
  });

  const nullAttributes = [
    'customelementregistry',
    'scopedcustomelementregistry',
    'polyfill-customelementregistry',
    'polyfill-scopedcustomelementregistry',
  ];
  const parsers = {
    innerHTML: (el, html) => (el.innerHTML = html),
    setHTMLUnsafe: (el, html) => el.setHTMLUnsafe?.(html),
    insertAdjacentHTML: (el, html) => el.insertAdjacentHTML('beforeend', html),
  };
  for (const attr of nullAttributes) {
    // Note, browsers don't know the polyfill names, and Chromium only knows
    // the old standard name.
    const test = attr === 'customelementregistry' ? it : itWithPolyfill;
    for (const [name, parse] of Object.entries(parsers)) {
      test(`${attr} via ${name}: null subtree, siblings unaffected`, async () => {
        if (name === 'setHTMLUnsafe' && !Element.prototype.setHTMLUnsafe) {
          return;
        }
        const {tagName, Logged} = defineLogged(customElements);
        const container = document.createElement('div');
        document.body.append(container);
        parse(
          container,
          `<div ${attr}><${tagName}></${tagName}></div><${tagName}></${tagName}>`
        );
        // Note, Firefox before Gecko bug 2074551 constructs elements parsed by
        // setHTMLUnsafe in a microtask; the polyfill then upgrades them in
        // another.
        await new Promise((resolve) => setTimeout(resolve));
        const inside = container.firstChild.firstChild;
        const sibling = container.lastChild;
        expect(container.firstChild.customElementRegistry).to.be.null;
        expect(inside.customElementRegistry).to.be.null;
        expect(inside).not.to.be.instanceOf(Logged);
        expect(sibling.customElementRegistry).to.equal(customElements);
        expect(sibling).to.be.instanceOf(Logged);
        container.remove();
      });
    }
  }
});

describe('Range.createContextualFragment', () => {
  it("gives the elements the context element's null registry", () => {
    const context = document.createElement('div', {
      customElementRegistry: null,
    });
    document.body.append(context);
    const range = document.createRange();
    range.selectNodeContents(context);
    const fragment = range.createContextualFragment('<span></span>');
    expect(fragment.firstChild.customElementRegistry).to.be.null;
    context.remove();
  });
});

describe('Null registry attributes only apply to newly parsed nodes', () => {
  // A parsed `customelementregistry` subtree, then initialized. Note,
  // `setHTMLUnsafe` is used since Chromium and WebKit ignore the attribute
  // when `innerHTML` takes their fast path parser, as it does for this markup.
  const initializedSubtree = (registry) => {
    const parent = document.createElement('div');
    parent.setHTMLUnsafe('<div customelementregistry></div>');
    const marked = parent.firstChild;
    registry.initialize(marked);
    return {parent, marked};
  };

  it('insertAdjacentHTML keeps a nearby registry', () => {
    const registry = new CustomElementRegistry();
    const {parent, marked} = initializedSubtree(registry);
    parent.insertAdjacentHTML('beforeend', '<span></span>');
    expect(marked.customElementRegistry).to.equal(registry);
  });

  it('outerHTML keeps a sibling registry', () => {
    const registry = new CustomElementRegistry();
    const {parent, marked} = initializedSubtree(registry);
    parent.append(document.createElement('i'));
    parent.lastChild.outerHTML = '<b></b>';
    expect(marked.customElementRegistry).to.equal(registry);
  });

  it('innerHTML keeps the target registry and gives it to the new children', () => {
    const registry = new CustomElementRegistry();
    const {marked} = initializedSubtree(registry);
    marked.innerHTML = '<span></span>';
    expect(marked.customElementRegistry).to.equal(registry);
    expect(marked.firstChild.customElementRegistry).to.equal(registry);
  });
});

describe('Declarative shadow roots via setHTMLUnsafe', () => {
  it('a root inside a scoped container uses the document registry', async () => {
    if (!Element.prototype.setHTMLUnsafe) {
      return;
    }
    const registry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(registry);
    const host = document.createElement('div');
    document.body.append(host);
    const container = host.attachShadow({
      mode: 'open',
      customElementRegistry: registry,
    });
    container.setHTMLUnsafe(
      `<div><template shadowrootmode="open"><${tagName}></${tagName}></template></div>`
    );
    // Note, Firefox before Gecko bug 2074551 constructs elements parsed by
    // setHTMLUnsafe in a microtask; the polyfill then upgrades them in another.
    await new Promise((resolve) => setTimeout(resolve));
    const root = container.firstChild.shadowRoot;
    expect(root.customElementRegistry).to.equal(customElements);
    expect(root.firstChild.customElementRegistry).to.equal(customElements);
    expect(root.firstChild).not.to.be.instanceOf(Logged);
    host.remove();
  });
});

describe('Elements in a null registry subtree', () => {
  // A parsed `customelementregistry` subtree, connected. Note, where the
  // browser has native support, it makes this null too, and elements it later
  // parses into it are never constructed. Note, `setHTMLUnsafe` is used since
  // Chromium and WebKit ignore the attribute when `innerHTML` takes their fast
  // path parser, as it does for this markup.
  const nullSubtree = () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    parent.setHTMLUnsafe('<div customelementregistry></div>');
    return {parent, marked: parent.firstChild};
  };

  it('an element parsed into it, then initialized, gets all later reactions', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged, log} = defineLogged(registry);
    const {parent, marked} = nullSubtree();
    marked.innerHTML = `<${tagName}></${tagName}>`;
    const el = marked.firstChild;
    expect(el.customElementRegistry).to.be.null;
    expect(log).to.deep.equal([]);
    registry.initialize(marked);
    expect(el).to.be.instanceOf(Logged);
    expect(log).to.deep.equal(['constructed', 'connected']);
    log.length = 0;
    el.remove();
    marked.append(el);
    el.setAttribute('v', '1');
    expect(log).to.deep.equal(['disconnected', 'connected', 'attr:1']);
    parent.remove();
  });

  it('an element created with a registry and inserted into it gets all reactions', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged, log} = defineLogged(registry);
    const {parent, marked} = nullSubtree();
    const el = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    marked.append(el);
    expect(el).to.be.instanceOf(Logged);
    expect(el.customElementRegistry).to.equal(registry);
    log.length = 0;
    el.remove();
    marked.append(el);
    el.setAttribute('v', '1');
    expect(log).to.deep.equal(['disconnected', 'connected', 'attr:1']);
    parent.remove();
  });
});

describe('Not yet customized: :state(polyfill-undefined)', () => {
  // Note, this is the selector to use in place of `:not(:defined)`, which
  // matches every stand-in, customized or not.
  const NOT_DEFINED = ':is(:not(:defined), :state(polyfill-undefined))';

  it('a customized element is defined', () => {
    const registry = new CustomElementRegistry();
    const {tagName} = defineLogged(registry);
    const el = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    expect(el.matches(NOT_DEFINED)).to.be.false;
  });

  it('an element with no definition in its registry is not defined, until one is added', () => {
    const {tagName} = defineLogged(customElements);
    const registry = new CustomElementRegistry();
    const el = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    document.body.append(el);
    expect(el.matches(NOT_DEFINED)).to.be.true;
    registry.define(tagName, class extends HTMLElement {});
    expect(el.matches(NOT_DEFINED)).to.be.false;
    el.remove();
  });

  it('an element with a null registry is not defined', () => {
    const {tagName} = defineLogged(customElements);
    const el = document.createElement(tagName, {customElementRegistry: null});
    expect(el.matches(NOT_DEFINED)).to.be.true;
  });

  it('an element whose constructor threw is not defined', () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        constructor() {
          super();
          throw new Error('boom');
        }
      }
    );
    const container = document.createElement('div');
    document.body.append(container);
    captureReportedErrors(() => {
      container.innerHTML = `<${tagName}></${tagName}>`;
    });
    expect(container.firstChild.matches(NOT_DEFINED)).to.be.true;
    container.remove();
  });

  it('an element constructed with new is defined', () => {
    const {Logged} = defineLogged(customElements);
    expect(new Logged().matches(NOT_DEFINED)).to.be.false;
  });

  it('attachInternals returns working internals, once', () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        constructor() {
          super();
          this.internals = this.attachInternals();
          this.internals.states.add('mine');
        }
      }
    );
    const el = document.createElement(tagName);
    expect(el.matches(':state(mine)')).to.be.true;
    expect(el.matches(':state(polyfill-undefined)')).to.be.false;
    expect(() => el.attachInternals()).to.throw(DOMException);
  });

  it('attachShadow throws when the class disables shadow', () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        static disabledFeatures = ['shadow'];
      }
    );
    expect(() =>
      document.createElement(tagName).attachShadow({mode: 'open'})
    ).to.throw(DOMException);
  });

  it('attachInternals throws when the class disables internals', () => {
    const tagName = getTestTagName();
    let error;
    customElements.define(
      tagName,
      class extends HTMLElement {
        static disabledFeatures = ['internals'];
        constructor() {
          super();
          try {
            this.attachInternals();
          } catch (e) {
            error = e;
          }
        }
      }
    );
    document.createElement(tagName);
    expect(error?.name).to.equal('NotSupportedError');
  });
});

describe('Every constructing API upgrades before it returns', () => {
  // An element created in an inert document is never constructed there.
  const unconstructed = (tagName) => inertDocument().createElement(tagName);

  it('inserting a never-constructed element', () => {
    const {tagName, Logged} = defineLogged(customElements);
    const el = unconstructed(tagName);
    document.body.append(el);
    expect(el).to.be.instanceOf(Logged);
    el.remove();
  });

  it('define, for elements already in the document', () => {
    const tagName = getTestTagName();
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = `<${tagName}></${tagName}>`;
    const {Logged} = defineLogged(customElements, tagName);
    expect(container.firstChild).to.be.instanceOf(Logged);
    container.remove();
  });

  it('Range.insertNode and Range.surroundContents', () => {
    const {tagName, Logged} = defineLogged(customElements);
    const container = document.createElement('div');
    container.textContent = 'x';
    document.body.append(container);
    const range = document.createRange();
    range.selectNodeContents(container);
    const inserted = unconstructed(tagName);
    range.insertNode(inserted);
    expect(inserted).to.be.instanceOf(Logged);
    const surrounding = unconstructed(tagName);
    range.selectNodeContents(container.lastChild);
    range.surroundContents(surrounding);
    expect(surrounding).to.be.instanceOf(Logged);
    container.remove();
  });

  it('Range.createContextualFragment, with the registry of its context', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(registry);
    const context = document.createElement('div', {
      customElementRegistry: registry,
    });
    document.body.append(context);
    const range = document.createRange();
    range.selectNodeContents(context);
    const el = range.createContextualFragment(`<${tagName}></${tagName}>`)
      .firstChild;
    expect(el.customElementRegistry).to.equal(registry);
    expect(el).to.be.instanceOf(Logged);
    context.remove();
  });

  it('an unpatched API upgrades in a microtask', async () => {
    const {tagName, Logged} = defineLogged(customElements);
    const container = document.createElement('div');
    container.contentEditable = 'true';
    document.body.append(container);
    container.focus();
    const range = document.createRange();
    range.selectNodeContents(container);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    document.execCommand('insertHTML', false, `<${tagName}></${tagName}>`);
    const el = container.querySelector(tagName);
    // Note, only some browsers (e.g. Firefox) construct elements inserted this
    // way; where the browser doesn't, it doesn't upgrade them natively either.
    if (el?.matches(':defined')) {
      await new Promise((resolve) => setTimeout(resolve));
      expect(el).to.be.instanceOf(Logged);
    }
    container.remove();
  });
});

describe('moveBefore', () => {
  // Defines a tag in `registry` whose class logs connection callbacks, with or
  // without `connectedMoveCallback`.
  const defineMovable = (registry, withMove, tagName = getTestTagName()) => {
    const log = [];
    class Movable extends HTMLElement {
      connectedCallback() {
        log.push('connected');
      }
      disconnectedCallback() {
        log.push('disconnected');
      }
    }
    if (withMove) {
      Movable.prototype.connectedMoveCallback = function () {
        log.push('move');
      };
    }
    registry.define(tagName, Movable);
    return {tagName, log};
  };

  // Creates `el` in one connected container, and returns a second one.
  const containers = (el) => {
    const from = document.createElement('div');
    const to = document.createElement('div');
    document.body.append(from, to);
    from.append(el);
    return {
      to,
      cleanup: () => {
        from.remove();
        to.remove();
      },
    };
  };

  beforeEach(function () {
    if (!Element.prototype.moveBefore) {
      this.skip();
    }
  });

  for (const [scope, makeRegistry] of [
    ['global', () => customElements],
    ['scoped', () => new CustomElementRegistry()],
  ]) {
    it(`calls connectedMoveCallback (${scope} registry)`, () => {
      const registry = makeRegistry();
      const {tagName, log} = defineMovable(registry, true);
      const el = document.createElement(tagName, {
        customElementRegistry: registry,
      });
      const {to, cleanup} = containers(el);
      log.length = 0;
      to.moveBefore(el, null);
      expect(log).to.deep.equal(['move']);
      cleanup();
    });
  }

  it('without connectedMoveCallback, disconnects and reconnects', () => {
    const {tagName, log} = defineMovable(customElements, false);
    const el = document.createElement(tagName);
    const {to, cleanup} = containers(el);
    log.length = 0;
    to.moveBefore(el, null);
    expect(log).to.deep.equal(['disconnected', 'connected']);
    cleanup();
  });

  it('an element not yet customized gets nothing, and upgrades when defined', () => {
    const registry = new CustomElementRegistry();
    const tagName = getTestTagName();
    // Note, a definition elsewhere gives the tag a stand-in.
    customElements.define(tagName, class extends HTMLElement {});
    const el = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    const {to, cleanup} = containers(el);
    to.moveBefore(el, null);
    // Note, the upgrade connects it; nothing is logged for the earlier move.
    const {log} = defineMovable(registry, true, tagName);
    expect(log).to.deep.equal(['connected']);
    cleanup();
  });
});

describe('Upgrade order', () => {
  it('elements queued together wait for a constructor that calls an entry point', () => {
    const log = [];
    const parent = getTestTagName();
    const child = getTestTagName();
    customElements.define(
      parent,
      class extends HTMLElement {
        constructor() {
          super();
          log.push('parent start');
          this.attachShadow({mode: 'open'});
          log.push('parent end');
        }
        connectedCallback() {
          log.push('parent connected');
        }
      }
    );
    customElements.define(
      child,
      class extends HTMLElement {
        constructor() {
          super();
          log.push('child');
        }
      }
    );
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = `<${parent}><${child}></${child}></${parent}>`;
    expect(log).to.deep.equal([
      'parent start',
      'parent end',
      'parent connected',
      'child',
    ]);
    container.remove();
  });

  it('elements created by an entry point in a constructor upgrade before it returns', () => {
    const inner = getTestTagName();
    const outer = getTestTagName();
    const {Logged} = defineLogged(customElements, inner);
    let upgradedInConstructor;
    customElements.define(
      outer,
      class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({mode: 'open'}).innerHTML = `<${inner}></${inner}>`;
          upgradedInConstructor = this.shadowRoot.firstChild instanceof Logged;
        }
      }
    );
    const container = document.createElement('div');
    container.innerHTML = `<${outer}></${outer}>`;
    expect(upgradedInConstructor).to.be.true;
  });
});

describe('Adoption', () => {
  it('a null element adopted from an inert document gets the document registry', () => {
    const el = inertDocument().createElement('div');
    expect(el.customElementRegistry).to.be.null;
    document.adoptNode(el);
    expect(el.customElementRegistry).to.equal(customElements);
  });

  it("insertion into a scoped parent doesn't change a null registry", () => {
    const el = document.createElement('div', {customElementRegistry: null});
    const parent = document.createElement('div', {
      customElementRegistry: new CustomElementRegistry(),
    });
    parent.append(el);
    expect(el.customElementRegistry).to.be.null;
  });

  it('upgrades an element natively created before adoption once inserted', () => {
    const {tagName, Logged} = defineLogged(customElements);
    const el = document.createElement(tagName, {customElementRegistry: null});
    inertDocument().adoptNode(el);
    document.body.append(el);
    expect(el).to.be.instanceOf(Logged);
    el.remove();
  });

  it('inserting into a document itself works', () => {
    const doc = document.implementation.createDocument(null, null);
    const el = document.createElement('div', {customElementRegistry: null});
    expect(() => doc.appendChild(el)).not.to.throw();
  });
});

describe('Adoption across documents', () => {
  it('a global element adopted into a document with no registry gets null', () => {
    const appended = document.createElement('div');
    document.createElement('template').content.append(appended);
    expect(appended.customElementRegistry).to.be.null;
    const adopted = document.createElement('div');
    inertDocument().adoptNode(adopted);
    expect(adopted.customElementRegistry).to.be.null;
  });

  it('adopting it back gives it the global registry again', () => {
    const el = document.createElement('div');
    inertDocument().adoptNode(el);
    document.adoptNode(el);
    expect(el.customElementRegistry).to.equal(customElements);
  });

  it('an element adopted back upgrades when connected, not on adoption', () => {
    const {tagName, Logged} = defineLogged(customElements);
    const el = document.createElement(tagName, {customElementRegistry: null});
    inertDocument().adoptNode(el);
    document.adoptNode(el);
    expect(el).not.to.be.instanceOf(Logged);
    document.body.append(el);
    expect(el).to.be.instanceOf(Logged);
    el.remove();
  });

  it('a never-constructed element inserted into a disconnected parent upgrades when connected', () => {
    const {tagName, Logged} = defineLogged(customElements);
    const el = inertDocument().createElement(tagName);
    const parent = document.createElement('div');
    parent.append(el);
    expect(el).not.to.be.instanceOf(Logged);
    document.body.append(parent);
    expect(el).to.be.instanceOf(Logged);
    parent.remove();
  });

  it('upgrade() of a never-constructed element stays upgraded once connected', () => {
    const {tagName, Logged} = defineLogged(customElements);
    const el = document.adoptNode(inertDocument().createElement(tagName));
    customElements.upgrade(el);
    expect(el).to.be.instanceOf(Logged);
    document.body.append(el);
    expect(el).to.be.instanceOf(Logged);
    el.remove();
  });

  it('a scoped element keeps its registry', () => {
    const registry = new CustomElementRegistry();
    const el = document.createElement('div', {customElementRegistry: registry});
    inertDocument().adoptNode(el);
    expect(el.customElementRegistry).to.equal(registry);
  });

  it('applies to descendants and shadow roots', () => {
    const host = document.createElement('div');
    host.innerHTML = '<p><span></span></p>';
    const root = host.attachShadow({mode: 'open'});
    inertDocument().adoptNode(host);
    expect(host.querySelector('span').customElementRegistry).to.be.null;
    expect(root.customElementRegistry).to.be.null;
  });
});

describe('Range.cloneContents', () => {
  it('copies each selected element with its registry', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(registry);
    const container = document.createElement('div');
    container.append(
      document.createElement(tagName, {customElementRegistry: registry}),
      document.createElement('div')
    );
    const range = document.createRange();
    range.selectNodeContents(container);
    const fragment = range.cloneContents();
    expect(fragment.children[0].customElementRegistry).to.equal(registry);
    expect(fragment.children[0]).to.be.instanceOf(Logged);
    expect(fragment.children[1].customElementRegistry).to.equal(customElements);
  });

  it('copies partially selected elements with their registries', () => {
    const registry = new CustomElementRegistry();
    const container = document.createElement('div');
    const first = document.createElement('p', {
      customElementRegistry: registry,
    });
    first.textContent = 'first';
    const last = document.createElement('p', {customElementRegistry: null});
    last.textContent = 'last';
    container.append(first, last);
    const range = document.createRange();
    range.setStart(first.firstChild, 2);
    range.setEnd(last.firstChild, 2);
    const fragment = range.cloneContents();
    expect(fragment.children[0].textContent).to.equal('rst');
    expect(fragment.children[0].customElementRegistry).to.equal(registry);
    expect(fragment.children[1].customElementRegistry).to.be.null;
  });

  it('copies a clonable shadow root with its registry', () => {
    const registry = new CustomElementRegistry();
    const {tagName, Logged} = defineLogged(registry);
    const container = document.createElement('div');
    const host = document.createElement('div');
    host.attachShadow({
      mode: 'open',
      clonable: true,
      customElementRegistry: registry,
    }).innerHTML = `<${tagName}></${tagName}>`;
    container.append(host);
    const range = document.createRange();
    range.selectNode(host);
    const copyRoot = range.cloneContents().firstChild.shadowRoot;
    expect(copyRoot.customElementRegistry).to.equal(registry);
    expect(copyRoot.firstChild).to.be.instanceOf(Logged);
  });
});

describe('Errors', () => {
  it("a throwing constructor doesn't propagate or stop its siblings", () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        constructor() {
          super();
          throw new Error('boom');
        }
      }
    );
    const {tagName: okTag, Logged} = defineLogged(customElements);
    const container = document.createElement('div');
    document.body.append(container);
    const errors = captureReportedErrors(() => {
      container.innerHTML = `<${tagName}></${tagName}><${okTag}></${okTag}>`;
    });
    expect(errors.map((e) => e.message)).to.deep.equal(['boom']);
    expect(container.lastChild).to.be.instanceOf(Logged);
    container.remove();
  });

  it('an element whose constructor threw gets no further reactions', () => {
    const tagName = getTestTagName();
    const log = [];
    customElements.define(
      tagName,
      class extends HTMLElement {
        static observedAttributes = ['v'];
        constructor() {
          super();
          throw new Error('boom');
        }
        attributeChangedCallback() {
          log.push('attr');
        }
      }
    );
    const container = document.createElement('div');
    document.body.append(container);
    captureReportedErrors(() => {
      container.innerHTML = `<${tagName}></${tagName}>`;
    });
    container.firstChild.setAttribute('v', '1');
    expect(log).to.deep.equal([]);
    container.remove();
  });

  it("a throwing connectedCallback doesn't stop later reactions", () => {
    const tagName = getTestTagName();
    const log = [];
    customElements.define(
      tagName,
      class extends HTMLElement {
        static observedAttributes = ['v'];
        connectedCallback() {
          throw new Error('boom');
        }
        attributeChangedCallback() {
          log.push('attr');
        }
      }
    );
    const container = document.createElement('div');
    document.body.append(container);
    captureReportedErrors(() => {
      container.innerHTML = `<${tagName}></${tagName}>`;
    });
    container.firstChild.setAttribute('v', '1');
    expect(log).to.deep.equal(['attr']);
    container.remove();
  });
});

describe('Constructors', () => {
  it('a constructor can create a custom element before calling super', () => {
    const {tagName: innerTag, Logged: Inner} = defineLogged(customElements);
    const tagName = getTestTagName();
    class Outer extends HTMLElement {
      constructor() {
        const inner = document.createElement(innerTag);
        super();
        this.inner = inner;
      }
    }
    customElements.define(tagName, Outer);
    const created = document.createElement(tagName);
    expect(created).to.be.instanceOf(Outer);
    expect(created.inner).to.be.instanceOf(Inner);
    const container = document.createElement('div');
    container.innerHTML = `<${tagName}></${tagName}>`;
    expect(container.firstChild).to.be.instanceOf(Outer);
    expect(container.firstChild.inner).to.be.instanceOf(Inner);
  });

  it('an upgrading constructor can construct another element class before calling super', () => {
    const {tagName: otherTag, Logged: Other} = defineLogged(customElements);
    const tagName = getTestTagName();
    class Outer extends HTMLElement {
      constructor() {
        const other = new Other();
        super();
        this.other = other;
      }
    }
    const container = document.createElement('div');
    container.innerHTML = `<${tagName}></${tagName}>`;
    document.body.append(container);
    customElements.define(tagName, Outer);
    const upgraded = container.firstChild;
    expect(upgraded).to.be.instanceOf(Outer);
    expect(upgraded.other).to.be.instanceOf(Other);
    expect(upgraded.other.localName).to.equal(otherTag);
    container.remove();
  });

  it('a constructor that throws before calling super runs once', () => {
    const tagName = getTestTagName();
    const container = document.createElement('div');
    container.innerHTML = `<${tagName}></${tagName}>`;
    document.body.append(container);
    let runs = 0;
    const errors = captureReportedErrors(() => {
      customElements.define(
        tagName,
        class extends HTMLElement {
          constructor() {
            runs++;
            throw new Error('before super');
          }
        }
      );
    });
    expect(runs).to.equal(1);
    expect(errors.length).to.equal(1);
    container.remove();
  });

  it('an upgrade fails if the class disables shadow and the element has a shadow root', () => {
    const tagName = getTestTagName();
    const container = document.createElement('div');
    document.body.append(container);
    const open = document.createElement(tagName);
    open.attachShadow({mode: 'open'});
    const closed = document.createElement(tagName);
    closed.attachShadow({mode: 'closed'});
    const declarative = document.createElement('div');
    declarative.setHTMLUnsafe?.(
      `<${tagName}><template shadowrootmode="closed"></template></${tagName}>`
    );
    container.append(open, closed, ...declarative.children);
    let constructed = 0;
    const errors = captureReportedErrors(() => {
      customElements.define(
        tagName,
        class extends HTMLElement {
          static disabledFeatures = ['shadow'];
          constructor() {
            super();
            constructed++;
          }
        }
      );
    });
    expect(constructed).to.equal(0);
    expect(errors.length).to.equal(container.children.length);
    expect(errors.every((e) => e.name === 'NotSupportedError')).to.be.true;
    container.remove();
  });

  it('a directly constructed element respects disabled internals', () => {
    class Element extends HTMLElement {
      static disabledFeatures = ['internals'];
    }
    customElements.define(getTestTagName(), Element);
    expect(() => new Element().attachInternals())
      .to.throw(DOMException)
      .with.property('name', 'NotSupportedError');
  });

  it('an upgrade fails if the constructor returns a different object', () => {
    const tagName = getTestTagName();
    const container = document.createElement('div');
    container.innerHTML = `<${tagName}></${tagName}>`;
    document.body.append(container);
    const errors = captureReportedErrors(() => {
      customElements.define(
        tagName,
        class extends HTMLElement {
          constructor() {
            super();
            return document.createElement('div');
          }
        }
      );
    });
    expect(errors.length).to.equal(1);
    expect(
      container.firstChild.matches(
        ':is(:not(:defined), :state(polyfill-undefined))'
      )
    ).to.be.true;
    container.remove();
  });
});

describe('Forms', () => {
  it("an ordinary form's elements behave natively", () => {
    const form = document.createElement('form');
    form.innerHTML = `<input id="email"><input type="radio" name="choice" value="a"><input type="radio" name="choice" value="b">`;
    const elements = form.elements;
    expect(form.elements).to.equal(elements);
    form.append(document.createElement('input'));
    expect(elements.length).to.equal(4);
    expect(elements.namedItem('email')).to.equal(form.querySelector('#email'));
    expect(elements.namedItem('length')).to.be.null;
    expect(elements.namedItem('item')).to.be.null;
    elements.namedItem('choice').value = 'b';
    expect(form.querySelector('[value=b]').checked).to.be.true;
  });

  it("an element whose own class isn't form-associated isn't part of the form", () => {
    // Note, the tag is form-associated because of its global definition.
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        static formAssociated = true;
        constructor() {
          super();
          this.attachInternals().setFormValue('associated');
        }
      }
    );
    const registry = new CustomElementRegistry();
    let setFormValueError;
    registry.define(
      tagName,
      class extends HTMLElement {
        constructor() {
          super();
          try {
            this.attachInternals().setFormValue('not associated');
          } catch (e) {
            setFormValueError = e;
          }
        }
      }
    );
    const form = document.createElement('form');
    form.innerHTML = '<input name="input" value="1">';
    const associated = document.createElement(tagName);
    associated.setAttribute('name', 'shared');
    const notAssociated = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    notAssociated.setAttribute('name', 'shared');
    const alone = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    alone.setAttribute('name', 'alone');
    form.append(associated, notAssociated, alone);
    expect(setFormValueError?.name).to.equal('NotSupportedError');
    expect([...new FormData(form).keys()]).to.deep.equal(['input', 'shared']);
    const {elements} = form;
    expect(elements.length).to.equal(2);
    expect(form.length).to.equal(2);
    expect([...elements]).to.deep.equal([form.firstChild, associated]);
    expect(elements[1]).to.equal(associated);
    expect(elements[2]).to.be.undefined;
    expect(elements.item(2)).to.be.null;
    expect(elements.namedItem('shared')).to.equal(associated);
    expect(elements.namedItem('alone')).to.be.null;
    expect(elements['alone']).to.be.undefined;
  });

  it("a name shared with an element whose own class isn't form-associated gives a list of the rest", () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        static formAssociated = true;
      }
    );
    const registry = new CustomElementRegistry();
    registry.define(tagName, class extends HTMLElement {});
    const form = document.createElement('form');
    form.innerHTML =
      '<input type="radio" name="choice" value="a"><input type="radio" name="choice" value="b">';
    const notAssociated = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    notAssociated.setAttribute('name', 'choice');
    form.append(notAssociated);
    const list = form.elements.namedItem('choice');
    expect(list).to.be.instanceOf(RadioNodeList);
    expect(list.length).to.equal(2);
    expect([...list]).to.deep.equal([...form.querySelectorAll('input')]);
    expect(form.elements.namedItem('choice')).to.equal(list);
    list.value = 'b';
    expect(form.querySelector('[value=b]').checked).to.be.true;
    expect(list.value).to.equal('b');
  });

  it("a numeric-looking name that isn't an index is looked up by name", () => {
    const form = document.createElement('form');
    form.innerHTML = '<input name="01"><input name="a">';
    expect(form.elements['01']).to.equal(form.firstChild);
  });

  it("an element whose class failed to construct isn't part of the form", () => {
    const tagName = getTestTagName();
    const form = document.createElement('form');
    form.innerHTML = `<input name="input"><${tagName}></${tagName}>`;
    document.body.append(form);
    let resets = 0;
    captureReportedErrors(() => {
      customElements.define(
        tagName,
        class extends HTMLElement {
          static formAssociated = true;
          constructor() {
            super();
            throw new Error('constructor');
          }
          formResetCallback() {
            resets++;
          }
        }
      );
    });
    expect(form.elements.length).to.equal(1);
    form.reset();
    expect(resets).to.equal(0);
    form.remove();
  });

  it("form.elements' keys and descriptors leave out elements whose own class isn't form-associated", () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        static formAssociated = true;
      }
    );
    const registry = new CustomElementRegistry();
    registry.define(tagName, class extends HTMLElement {});
    const form = document.createElement('form');
    const notAssociated = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    notAssociated.setAttribute('name', 'excluded');
    form.append(notAssociated);
    form.insertAdjacentHTML('beforeend', '<input name="a"><input name="b">');
    const {elements} = form;
    const inputs = [...form.querySelectorAll('input')];
    expect(Object.getOwnPropertyDescriptor(elements, '0').value).to.equal(
      inputs[0]
    );
    expect(Object.getOwnPropertyDescriptor(elements, '2')).to.be.undefined;
    expect('2' in elements).to.be.false;
    expect(
      Reflect.ownKeys(elements).filter((key) => /^\d+$/.test(key))
    ).to.deep.equal(['0', '1']);
    expect(Reflect.ownKeys(elements)).not.to.include('excluded');
  });

  it("names that are list methods elsewhere are controls in a form's elements", () => {
    const form = document.createElement('form');
    const names = ['entries', 'forEach', 'keys', 'values'];
    form.innerHTML = names.map((name) => `<input name="${name}">`).join('');
    for (const [index, name] of names.entries()) {
      expect(form.elements[name], name).to.equal(form.children[index]);
    }
  });

  it("ElementInternals rejects form members for an element whose own class isn't form-associated", () => {
    const tagName = getTestTagName();
    customElements.define(
      tagName,
      class extends HTMLElement {
        static formAssociated = true;
      }
    );
    const registry = new CustomElementRegistry();
    registry.define(
      tagName,
      class extends HTMLElement {
        constructor() {
          super();
          this.internals = this.attachInternals();
        }
      }
    );
    const {internals} = document.createElement(tagName, {
      customElementRegistry: registry,
    });
    for (const member of [
      'form',
      'labels',
      'willValidate',
      'validity',
      'validationMessage',
    ]) {
      expect(() => internals[member], member)
        .to.throw(DOMException)
        .with.property('name', 'NotSupportedError');
    }
  });

  // Note, Chromium allows it, but a failed element isn't a custom element, so
  // it isn't form-associated.
  itWithPolyfill(
    'ElementInternals rejects form methods for an element whose constructor failed',
    () => {
      const tagName = getTestTagName();
      const container = document.createElement('div');
      container.innerHTML = `<${tagName}></${tagName}>`;
      document.body.append(container);
      let internals;
      captureReportedErrors(() => {
        customElements.define(
          tagName,
          class extends HTMLElement {
            static formAssociated = true;
            constructor() {
              super();
              internals = this.attachInternals();
              throw new Error('constructor');
            }
          }
        );
      });
      expect(() => internals.setFormValue('value'))
        .to.throw(DOMException)
        .with.property('name', 'NotSupportedError');
      container.remove();
    }
  );

  it('a directly constructed form-associated element can use its internals', () => {
    class FormElement extends HTMLElement {
      static formAssociated = true;
    }
    customElements.define(getTestTagName(), FormElement);
    const element = new FormElement();
    const internals = element.attachInternals();
    const form = document.createElement('form');
    form.append(element);
    internals.setFormValue('value');
    expect(internals.form).to.equal(form);
    expect([...form.elements]).to.deep.equal([element]);
  });

  it("a directly constructed element whose class isn't form-associated isn't part of the form", () => {
    const tagName = getTestTagName();
    window.CustomElementRegistryPolyfill?.formAssociated?.add(tagName);
    class Element extends HTMLElement {}
    customElements.define(tagName, Element);
    const form = document.createElement('form');
    form.append(new Element());
    expect(form.elements.length).to.equal(0);
  });

  it('form.elements is iterable', () => {
    const form = document.createElement('form');
    form.append(document.createElement('input'));
    expect(Array.from(form.elements).length).to.equal(1);
  });
});
