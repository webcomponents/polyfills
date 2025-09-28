import {expect, nextFrame} from '@open-wc/testing';
import {
  getTestElement,
  createTemplate,
  getUninitializedShadowRoot,
} from './utils.js';

export const commonRegistryTests = (registry) => {
  describe('define', () => {
    it('should be able to define custom elements', () => {
      const {tagName, CustomElementClass} = getTestElement();

      registry.define(tagName, CustomElementClass);
    });

    it('should throw if the tag name has been defined previously', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const {CustomElementClass: SecondCustomElementClass} = getTestElement();

      registry.define(tagName, CustomElementClass);

      expect(() =>
        registry.define(tagName, SecondCustomElementClass)
      ).to.throw();
    });

    it('should throw if the custom element has been defined previously', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const {tagName: secondTagName} = getTestElement();

      registry.define(tagName, CustomElementClass);

      expect(() =>
        registry.define(secondTagName, CustomElementClass)
      ).to.throw();
    });
  });

  describe('get', () => {
    it(`should get a defined custom element through it's tagName`, () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);

      expect(registry.get(tagName)).to.be.equal(CustomElementClass);
      expect(registry.get(tagName)).to.be.equal(CustomElementClass);
    });

    it('should undefined if the tagName is not defined', () => {
      const {tagName} = getTestElement();

      expect(registry.get(tagName)).to.be.undefined;
    });
  });

  describe('upgrade', () => {
    it('should upgrade a custom element directly', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const $el = document.createElement(tagName, {
        customElementRegistry: registry,
      });
      registry.define(tagName, CustomElementClass);

      expect($el).to.not.be.instanceof(CustomElementClass);
      registry.upgrade($el);

      expect($el).to.be.instanceof(CustomElementClass);
    });
  });

  describe('whenDefined', () => {
    it('should return a promise that resolves when a custom element becomes defined with a given name', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      let defined = false;

      registry.whenDefined(tagName).then(() => (defined = true));

      expect(defined).to.be.false;

      registry.define(tagName, CustomElementClass);
      await nextFrame();

      expect(defined).to.be.true;
    });
  });

  describe('createElement', () => {
    it('should create built-in elements', async () => {
      const el = document.createElement('div', {});
      expect(el).to.be.ok;
    });

    it('should create custom elements', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      const el = document.createElement(tagName, {
        customElementRegistry: registry,
      });
      expect(el).to.be.instanceOf(CustomElementClass);
    });
  });

  describe('importNode', () => {
    it('should upgrade custom elements in an imported subtree', async () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      const template = createTemplate(`
        <${tagName}><${tagName}></${tagName}></${tagName}>
        <${tagName}><${tagName}></${tagName}></${tagName}>
      `);
      const clone = document.importNode(template.content, {
        customElementRegistry: registry,
      });
      const els = clone.querySelectorAll(tagName);
      expect(els.length).to.be.equal(4);
      els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
    });
  });

  describe('initialize', () => {
    it('can create uninitialized roots', async () => {
      const shadowRoot = getUninitializedShadowRoot();
      expect(shadowRoot.customElementRegistry).to.be.null;
      shadowRoot.innerHTML = `<div></div>`;
      const el = shadowRoot.firstElementChild;
      expect(el.customElementRegistry).to.be.null;
    });

    it('initialize sets customElements', async () => {
      const shadowRoot = getUninitializedShadowRoot();
      shadowRoot.innerHTML = `<div></div>`;
      registry.initialize(shadowRoot);
      expect(shadowRoot.customElementRegistry).to.be.equal(registry);
      shadowRoot.innerHTML = `<div></div>`;
      const el = shadowRoot.firstElementChild;
      expect(el.customElementRegistry).to.be.equal(registry);
    });

    it('initialize sets customElements for entire subtree where null', async function () {
      if (!window.CustomElementRegistryPolyfill.inUse) {
        // https://bugs.webkit.org/show_bug.cgi?id=299299
        this.skip();
      }
      const shadowRoot = getUninitializedShadowRoot();
      shadowRoot.innerHTML = `<div></div>`;
      const el = shadowRoot.firstElementChild;
      const registry2 = new CustomElementRegistry();
      registry2.initialize(el);
      const expectRegistryForSubtree = (node, registry) => {
        expect(node.customElementRegistry).to.be.equal(registry);
        node.querySelectorAll('*').forEach((child) => {
          expect(child.customElementRegistry).to.be.equal(registry);
        });
      };
      el.innerHTML = `<div><div></div></div>`;
      expectRegistryForSubtree(el, registry2);
      el.insertAdjacentHTML('afterend', `<div><div></div></div>`);
      const el2 = shadowRoot.lastChild;
      expectRegistryForSubtree(el2, null);
      registry.initialize(shadowRoot);
      expectRegistryForSubtree(el, registry2);
      expectRegistryForSubtree(el2, registry);
    });

    it('should not upgrade custom elements in uninitialized subtree', async () => {
      const shadowRoot = getUninitializedShadowRoot();
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      shadowRoot.innerHTML = `<${tagName}></${tagName}><div></div>`;
      const el = shadowRoot.firstElementChild;
      const container = shadowRoot.lastElementChild;
      expect(el.localName).to.be.equal(tagName);
      expect(el).not.to.be.instanceOf(CustomElementClass);
      container.innerHTML = `<${tagName}></${tagName}>`;
      const el2 = container.firstElementChild;
      expect(el2.localName).to.be.equal(tagName);
      expect(el2).not.to.be.instanceOf(CustomElementClass);
    });

    it('should not upgrade custom elements in initialized subtree', async () => {
      const shadowRoot = getUninitializedShadowRoot();
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      shadowRoot.innerHTML = `<${tagName}></${tagName}><div></div>`;
      registry.initialize(shadowRoot);
      const el = shadowRoot.firstElementChild;
      const container = shadowRoot.lastElementChild;
      expect(el.localName).to.be.equal(tagName);
      expect(el).not.to.be.instanceOf(CustomElementClass);
      // Note, with the tree initialized, the parent's registry is set
      // even though it is not customized. So innerHTML uses the parent's
      // registry.
      container.innerHTML = `<${tagName}></${tagName}>`;
      const el2 = container.firstElementChild;
      expect(el2.localName).to.be.equal(tagName);
      expect(el2).to.be.instanceOf(CustomElementClass);
    });
  });

  describe('null customElements', () => {
    describe('do not customize when created', () => {
      it('with innerHTML', function () {
        if (!window.CustomElementRegistryPolyfill.inUse) {
          // https://bugs.webkit.org/show_bug.cgi?id=299603
          this.skip();
        }
        const shadowRoot = getUninitializedShadowRoot();
        const {tagName, CustomElementClass} = getTestElement();
        // globally define this
        customElements.define(tagName, CustomElementClass);
        document.body.append(shadowRoot.host);
        shadowRoot.innerHTML = `
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `;
        const els = shadowRoot.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) =>
          expect(el).not.to.be.instanceOf(CustomElementClass)
        );
        shadowRoot.host.remove();
      });
      it('with insertAdjacentHTML', function () {
        if (!window.CustomElementRegistryPolyfill.inUse) {
          // https://bugs.webkit.org/show_bug.cgi?id=299603
          this.skip();
        }
        const shadowRoot = getUninitializedShadowRoot();
        const {tagName, CustomElementClass} = getTestElement();
        // globally define this
        customElements.define(tagName, CustomElementClass);
        document.body.append(shadowRoot.host);
        shadowRoot.innerHTML = `<div></div>`;
        shadowRoot.firstElementChild.insertAdjacentHTML(
          'afterbegin',
          `
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `
        );
        const els = shadowRoot.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) =>
          expect(el).not.to.be.instanceOf(CustomElementClass)
        );
        shadowRoot.host.remove();
      });
      it('with setHTMLUnsafe', function () {
        if (!window.CustomElementRegistryPolyfill.inUse) {
          // https://bugs.webkit.org/show_bug.cgi?id=299603
          this.skip();
        }
        if (!(`setHTMLUnsafe` in Element.prototype)) {
          this.skip();
        }
        const shadowRoot = getUninitializedShadowRoot();
        const {tagName, CustomElementClass} = getTestElement();
        // globally define this
        customElements.define(tagName, CustomElementClass);
        document.body.append(shadowRoot.host);
        shadowRoot.innerHTML = `<div></div>`;
        shadowRoot.firstElementChild.setHTMLUnsafe(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const els = shadowRoot.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) =>
          expect(el).not.to.be.instanceOf(CustomElementClass)
        );
        shadowRoot.host.remove();
      });
    });
    describe('customize when connected', () => {
      it('append from uninitialized shadowRoot', async function () {
        if (!window.CustomElementRegistryPolyfill.inUse) {
          // https://bugs.webkit.org/show_bug.cgi?id=299603
          this.skip();
        }
        const shadowRoot = getUninitializedShadowRoot();
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        document.body.append(container);
        shadowRoot.innerHTML = `
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `;
        container.append(shadowRoot);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('cloned and appended from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const clone = template.content.cloneNode(true);
        clone.querySelectorAll('*').forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        container.append(clone);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('append from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        content.querySelectorAll('*').forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        container.append(content);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('appendChild from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        content.querySelectorAll('*').forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        container.appendChild(content);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('insertBefore from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        content.querySelectorAll('*').forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        container.insertBefore(content, null);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('prepend from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        content.querySelectorAll('*').forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        container.prepend(content);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('insertAdjacentElement from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        const parent = document.createElement('div', {
          customElementRegistry: registry,
        });
        container.append(parent);
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        const contentEls = Array.from(content.querySelectorAll('*'));
        contentEls.forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        parent.insertAdjacentElement('beforebegin', contentEls[1]);
        parent.insertAdjacentElement('afterend', contentEls[2]);
        parent.insertAdjacentElement('afterbegin', contentEls[0]);
        parent.insertAdjacentElement('beforeend', contentEls[3]);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('replaceChild from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        const parent = document.createElement('div', {
          customElementRegistry: registry,
        });
        container.append(parent);
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        const contentEls = Array.from(content.querySelectorAll('*'));
        contentEls.forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        container.replaceChild(content, parent);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('replaceChildren from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        const parent = document.createElement('div', {
          customElementRegistry: registry,
        });
        container.append(parent);
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        const contentEls = Array.from(content.querySelectorAll('*'));
        contentEls.forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        container.replaceChildren(...Array.from(content.childNodes));
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });

      it('replaceWith from a template', async () => {
        const {tagName, CustomElementClass} = getTestElement();
        registry.define(tagName, CustomElementClass);
        const container = document.createElement('div', {
          customElementRegistry: registry,
        });
        const parent = document.createElement('div', {
          customElementRegistry: registry,
        });
        container.append(parent);
        document.body.append(container);
        const template = createTemplate(`
          <${tagName}><${tagName}></${tagName}></${tagName}>
          <${tagName}><${tagName}></${tagName}></${tagName}>
        `);
        const {content} = template;
        const contentEls = Array.from(content.querySelectorAll('*'));
        contentEls.forEach((el) => {
          expect(el.customElementRegistry).to.be.null;
        });
        parent.replaceWith(content);
        const els = container.querySelectorAll(tagName);
        expect(els.length).to.be.equal(4);
        els.forEach((el) => expect(el).to.be.instanceOf(CustomElementClass));
        container.remove();
      });
    });
  });

  describe('mixed registries', () => {
    it('uses root registry when appending', async function () {
      const shadowRoot = getUninitializedShadowRoot();
      const {host} = shadowRoot;
      document.body.append(host);
      const registry2 = new CustomElementRegistry();
      shadowRoot.innerHTML = `<div></div>`;
      const el = shadowRoot.firstElementChild;
      registry2.initialize(el);
      registry.initialize(shadowRoot);
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      class CustomElementClass2 extends CustomElementClass {}
      registry2.define(tagName, CustomElementClass2);
      const template = createTemplate(`
          <${tagName}></${tagName}>
          <${tagName}></${tagName}>
        `);
      const c1 = template.content.firstElementChild;
      const c2 = template.content.lastElementChild;
      el.appendChild(c1);
      expect(c1).to.be.instanceOf(CustomElementClass);
      shadowRoot.appendChild(c2);
      expect(c2).to.be.instanceOf(CustomElementClass);
      host.remove();
    });

    it('uses parent registry when parsing from HTML', async function () {
      if (!window.CustomElementRegistryPolyfill.inUse) {
        // https://bugs.webkit.org/show_bug.cgi?id=299299
        this.skip();
      }
      const shadowRoot = getUninitializedShadowRoot();
      const registry2 = new CustomElementRegistry();
      shadowRoot.innerHTML = `<div></div>`;
      const el = shadowRoot.firstElementChild;
      registry2.initialize(el);
      registry.initialize(shadowRoot);
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      class CustomElementClass2 extends CustomElementClass {}
      registry2.define(tagName, CustomElementClass2);
      el.innerHTML = `<${tagName}></${tagName}>`;
      el.insertAdjacentHTML('beforeend', `<${tagName}></${tagName}>`);
      expect(el.firstElementChild).to.be.instanceOf(CustomElementClass2);
      expect(el.lastElementChild).to.be.instanceOf(CustomElementClass2);
      el.insertAdjacentHTML('beforebegin', `<${tagName}></${tagName}>`);
      el.insertAdjacentHTML('afterend', `<${tagName}></${tagName}>`);
      expect(el.previousElementSibling).to.be.instanceOf(CustomElementClass);
      expect(el.nextElementSibling).to.be.instanceOf(CustomElementClass);
    });
  });

  it('uses source registry when importing', function () {
    if (!window.CustomElementRegistryPolyfill.inUse) {
      // https://bugs.webkit.org/show_bug.cgi?id=299299
      this.skip();
    }
    const {tagName, CustomElementClass} = getTestElement();
    registry.define(tagName, CustomElementClass);

    const registry1 = new CustomElementRegistry();
    const Registry1CustomElementClass = class extends HTMLElement {};
    registry1.define(tagName, Registry1CustomElementClass);

    const registry2 = new CustomElementRegistry();
    const Registry2CustomElementClass = class extends HTMLElement {};
    registry2.define(tagName, Registry2CustomElementClass);

    const registry3 = new CustomElementRegistry();
    const Registry3CustomElementClass = class extends HTMLElement {};
    registry3.define(tagName, Registry3CustomElementClass);

    const shadowRoot = getUninitializedShadowRoot();
    shadowRoot.innerHTML = `<div><${tagName}></${tagName}></div>`;
    const container = shadowRoot.firstElementChild;
    const er = container.firstElementChild;
    const er1 = document.createElement(tagName, {
      customElementRegistry: registry1,
    });
    const er2 = document.createElement(tagName, {
      customElementRegistry: registry2,
    });
    const er3 = document.createElement(tagName, {
      customElementRegistry: registry3,
    });
    container.append(er1, er2);
    er2.append(er3);

    expect(er.customElementRegistry).to.be.equal(null);
    expect(er).not.to.be.instanceof(CustomElementClass);
    expect(er1.customElementRegistry).to.be.equal(registry1);
    expect(er1).to.be.instanceof(Registry1CustomElementClass);
    expect(er2.customElementRegistry).to.be.equal(registry2);
    expect(er2).to.be.instanceof(Registry2CustomElementClass);
    expect(er3.customElementRegistry).to.be.equal(registry3);
    expect(er3).to.be.instanceof(Registry3CustomElementClass);
    const imported = document.importNode(container, {
      customElementRegistry: registry,
    });

    const ier = imported.firstElementChild;
    const ier1 = ier.nextElementSibling;
    const ier2 = ier1.nextElementSibling;
    const ier3 = ier2.firstElementChild;
    expect(ier.customElementRegistry).to.be.equal(registry);
    expect(ier).to.be.instanceof(CustomElementClass);
    expect(ier1.customElementRegistry).to.be.equal(registry1);
    expect(ier1).to.be.instanceof(Registry1CustomElementClass);
    expect(ier2.customElementRegistry).to.be.equal(registry2);
    expect(ier2).to.be.instanceof(Registry2CustomElementClass);
    expect(ier3.customElementRegistry).to.be.equal(registry3);
    expect(ier3).to.be.instanceof(Registry3CustomElementClass);
  });

  it('uses source registry when cloning', function () {
    if (!window.CustomElementRegistryPolyfill.inUse) {
      // https://bugs.webkit.org/show_bug.cgi?id=299299
      this.skip();
    }
    const {tagName, CustomElementClass} = getTestElement();
    registry.define(tagName, CustomElementClass);

    const registry1 = new CustomElementRegistry();
    const Registry1CustomElementClass = class extends HTMLElement {};
    registry1.define(tagName, Registry1CustomElementClass);

    const registry2 = new CustomElementRegistry();
    const Registry2CustomElementClass = class extends HTMLElement {};
    registry2.define(tagName, Registry2CustomElementClass);

    const registry3 = new CustomElementRegistry();
    const Registry3CustomElementClass = class extends HTMLElement {};
    registry3.define(tagName, Registry3CustomElementClass);

    const shadowRoot = getUninitializedShadowRoot();
    shadowRoot.innerHTML = `<div><${tagName}></${tagName}></div>`;
    const container = shadowRoot.firstElementChild;
    const er = container.firstElementChild;
    const er1 = document.createElement(tagName, {
      customElementRegistry: registry1,
    });
    const er2 = document.createElement(tagName, {
      customElementRegistry: registry2,
    });
    const er3 = document.createElement(tagName, {
      customElementRegistry: registry3,
    });
    container.append(er1, er2);
    er2.append(er3);

    expect(er.customElementRegistry).to.be.equal(null);
    expect(er).not.to.be.instanceof(CustomElementClass);
    expect(er1.customElementRegistry).to.be.equal(registry1);
    expect(er1).to.be.instanceof(Registry1CustomElementClass);
    expect(er2.customElementRegistry).to.be.equal(registry2);
    expect(er2).to.be.instanceof(Registry2CustomElementClass);
    expect(er3.customElementRegistry).to.be.equal(registry3);
    expect(er3).to.be.instanceof(Registry3CustomElementClass);
    const cloned = container.cloneNode(true);

    const ier = cloned.firstElementChild;
    const ier1 = ier.nextElementSibling;
    const ier2 = ier1.nextElementSibling;
    const ier3 = ier2.firstElementChild;
    expect(ier.customElementRegistry).to.be.null;
    expect(ier).not.to.be.instanceof(CustomElementClass);
    expect(ier1.customElementRegistry).to.be.equal(registry1);
    expect(ier1).to.be.instanceof(Registry1CustomElementClass);
    expect(ier2.customElementRegistry).to.be.equal(registry2);
    expect(ier2).to.be.instanceof(Registry2CustomElementClass);
    expect(ier3.customElementRegistry).to.be.equal(registry3);
    expect(ier3).to.be.instanceof(Registry3CustomElementClass);
  });
};
