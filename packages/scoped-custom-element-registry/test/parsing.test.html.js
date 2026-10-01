/* global log, registry, GlobalEl, ScopedEl, readWhileParsing,
   innerHTMLUpgradedWhileParsing, defineUpgradedWhileParsing */
// Note, these are defined by the classic scripts in parsing.test.html.
import {expect} from '@open-wc/testing';
import {itWithPolyfill} from './utils.js';

// Elements parsed into null registry subtrees must never be constructed.
const nullWheres = [
  'std',
  'poly',
  'init-doc',
  'scoped',
  'poly-scoped',
  'self',
  'open-both',
  'open-host',
  'closed-plain',
  'closed-ce',
  'init-global-after',
];

describe('Main document parsing', () => {
  // Note, natively the parser runs constructors before setting attributes, so
  // the log can't say where an element is; and it uses the polyfill names.
  itWithPolyfill(
    'constructs only elements outside null registry subtrees, with the global registry',
    () => {
      for (const where of nullWheres) {
        expect(log, where).not.to.include(`global:${where}`);
        expect(log, where).not.to.include(`scoped:${where}`);
      }
      expect(log).to.include('global:after-std');
      expect(log).to.include('global:after-self');
    }
  );

  // Note, uses the polyfill names and the new standard name.
  itWithPolyfill(
    'element attribute: the subtree has a null registry, siblings are global',
    () => {
      for (const id of ['std', 'poly', 'scoped', 'poly-scoped']) {
        const container = document.getElementById(id);
        expect(container.customElementRegistry, id).to.be.null;
        expect(container.firstElementChild.customElementRegistry, id).to.be
          .null;
      }
      expect(document.getElementById('self').customElementRegistry).to.be.null;
      expect(
        document.getElementById('after-std').customElementRegistry
      ).to.equal(customElements);
      expect(
        document.getElementById('after-self').customElementRegistry
      ).to.equal(customElements);
    }
  );

  // Note, one of the roots has only the polyfill's host attribute.
  itWithPolyfill(
    'open declarative root with the host attribute has a null registry',
    () => {
      for (const id of ['open-both', 'open-host']) {
        const root = document.getElementById(id).shadowRoot;
        expect(root.customElementRegistry, id).to.be.null;
        expect(root.firstElementChild.customElementRegistry, id).to.be.null;
      }
    }
  );

  it('open declarative null root can be initialized', () => {
    const root = document.getElementById('open-both').shadowRoot;
    registry.initialize(root);
    expect(root.customElementRegistry).to.equal(registry);
    expect(log).to.include('scoped:open-both');
  });

  it('closed null root on a custom element host: reachable via internals, content kept, initializable', () => {
    const root = document.getElementById('closed-ce').internals.shadowRoot;
    expect(root.customElementRegistry).to.be.null;
    const el = root.firstElementChild;
    expect(el.customElementRegistry).to.be.null;
    registry.initialize(root);
    expect(el.customElementRegistry).to.equal(registry);
    expect(log).to.include('scoped:closed-ce');
  });

  it('closed null root on a plain host: attachShadow returns it emptied and null, initializable', () => {
    const root = document
      .getElementById('closed-plain')
      .attachShadow({mode: 'closed'});
    expect(root.childNodes.length).to.equal(0);
    expect(root.customElementRegistry).to.be.null;
    root.innerHTML = '<p-el data-where="closed-plain-new"></p-el>';
    expect(root.firstElementChild.customElementRegistry).to.be.null;
    registry.initialize(root);
    expect(log).to.include('scoped:closed-plain-new');
    expect(log).not.to.include('global:closed-plain-new');
  });

  it('a tag defined after parsing upgrades only outside null registry roots', () => {
    const constructed = [];
    customElements.define(
      'p-late',
      class extends HTMLElement {
        constructor() {
          super();
          constructed.push(this.dataset.where);
        }
      }
    );
    expect(constructed).to.deep.equal(['late-outside']);
  });

  it('clones a declarative clonable root with the global registry', () => {
    const copy = document.getElementById('clone-global').cloneNode(true);
    const el = copy.shadowRoot.firstElementChild;
    expect(copy.shadowRoot.customElementRegistry).to.equal(customElements);
    expect(el.customElementRegistry).to.equal(customElements);
    expect(el).to.be.instanceOf(GlobalEl);
  });

  it('clones an initialized declarative null root with its registry and lifecycle', () => {
    const host = document.getElementById('clone-null');
    registry.initialize(host.shadowRoot);
    const copy = host.cloneNode(true);
    const el = copy.shadowRoot.firstElementChild;
    expect(copy.shadowRoot.customElementRegistry).to.equal(registry);
    expect(el).to.be.instanceOf(ScopedEl);
    const connectedCount = () =>
      log.filter((entry) => entry === 'connected:clone-null').length;
    const before = connectedCount();
    document.body.append(copy);
    copy.remove();
    document.body.append(copy);
    expect(connectedCount() - before).to.equal(2);
    copy.remove();
  });

  it('closed null root on a custom element host with nothing custom inside: null, initializable', () => {
    customElements.define(
      'p-dsd-host',
      class extends HTMLElement {
        constructor() {
          super();
          this.internals = this.attachInternals();
        }
      }
    );
    const root = document.getElementById('dsd-ce-empty').internals.shadowRoot;
    expect(root.customElementRegistry).to.be.null;
    expect(root.firstElementChild.customElementRegistry).to.be.null;
    registry.initialize(root);
    expect(root.firstElementChild.customElementRegistry).to.equal(registry);
  });

  const NOT_DEFINED = ':is(:not(:defined), :state(polyfill-undefined))';

  // Note, the polyfill's custom state.
  itWithPolyfill(
    'an element is not defined while parsing, and is defined once customized',
    () => {
      expect(window.notDefinedWhileParsing).to.be.true;
      expect(document.getElementById('while-parsing').matches(NOT_DEFINED)).to
        .be.false;
    }
  );

  // Note, the polyfill's custom state.
  itWithPolyfill('elements in null registry subtrees are not defined', () => {
    for (const id of ['std', 'poly', 'scoped', 'poly-scoped']) {
      expect(
        document.getElementById(id).firstElementChild.matches(NOT_DEFINED),
        id
      ).to.be.true;
    }
    expect(document.getElementById('self').matches(NOT_DEFINED)).to.be.true;
  });

  // Note, this is last since it initializes every null registry element in
  // the document.
  it('an entry point used by a script during parsing customizes before returning', () => {
    expect(innerHTMLUpgradedWhileParsing).to.be.true;
    expect(defineUpgradedWhileParsing).to.be.true;
  });

  it('a script reads a null registry during parsing', () => {
    expect(readWhileParsing).to.be.null;
  });

  it('initialize during parsing: elements parsed afterwards inherit the registry', () => {
    const element = (id) => document.getElementById(id);
    expect(element('init-global').customElementRegistry).to.equal(
      customElements
    );
    expect(element('init-global-child').customElementRegistry).to.equal(
      customElements
    );
    expect(element('init-global-child')).to.be.instanceOf(GlobalEl);
    expect(element('init-scoped').customElementRegistry).to.equal(registry);
    expect(element('init-scoped-child').customElementRegistry).to.equal(
      registry
    );
    expect(element('init-scoped-child')).to.be.instanceOf(ScopedEl);
  });

  it('initialize during parsing: an already parsed null element is initialized, a later one stays null', () => {
    expect(
      document.getElementById('init-global-before').customElementRegistry
    ).to.equal(customElements);
    expect(document.getElementById('init-global-after').customElementRegistry)
      .to.be.null;
  });

  it('a parsed element keeps its registry when moved into a scoped root', () => {
    const scoped = new CustomElementRegistry();
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({
      mode: 'open',
      customElementRegistry: scoped,
    });
    const element = document.getElementById('move');
    root.append(element);
    let constructed = false;
    scoped.define(
      'p-move',
      class extends HTMLElement {
        constructor() {
          super();
          constructed = true;
        }
      }
    );
    expect(constructed).to.be.false;
    expect(element.customElementRegistry).to.equal(customElements);
    host.remove();
  });

  // Note, these run before the test that initializes the document.
  for (const element of document.querySelectorAll('[data-move]')) {
    it(`an element moved or removed during parsing keeps its registry: ${element.dataset.move}`, () => {
      expect(element.customElementRegistry).to.be.null;
    });
  }
  it('initialize(document) upgrades null registry elements through the browser', () => {
    const el = document.getElementById('init-doc');
    registry.initialize(document);
    expect(el.customElementRegistry).to.equal(registry);
    expect(el).to.be.instanceOf(ScopedEl);
    // Note, where the browser has native support, it made this element null
    // too, so it only becomes a native custom element if initialized natively.
    expect(el.matches(':defined')).to.be.true;
  });
});
