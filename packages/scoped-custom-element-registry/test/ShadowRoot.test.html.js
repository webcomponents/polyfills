import {expect} from '@open-wc/testing';

// prettier-ignore
import {getTestTagName, getTestElement, getShadowRoot, getHTML, createTemplate} from './utils.js';

describe('ShadowRoot', () => {
  it('should be able to be associate a custom registry', () => {
    const registry = new CustomElementRegistry();
    const tagName = getTestTagName();
    const CustomElementClass = class extends HTMLElement {
      constructor() {
        super();

        this.attachShadow({mode: 'open', customElementRegistry: registry});
      }
    };
    customElements.define(tagName, CustomElementClass);

    const $el = new CustomElementClass();

    expect($el).to.be.instanceof(CustomElementClass);
    expect($el.shadowRoot.customElementRegistry).to.be.equal(registry);
  });

  describe('with custom registry', () => {
    describe('createElement', () => {
      it('should create a regular element', () => {
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);

        const $el = document.createElement('div', {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($el).to.not.be.undefined;
        expect($el).to.be.instanceof(HTMLDivElement);
      });

      it(`shouldn't upgrade an element defined in the global registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);

        const $el = document.createElement(tagName, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($el).to.not.be.undefined;
        expect($el).to.not.be.instanceof(CustomElementClass);
      });

      it(`should upgrade an element defined in the custom registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        registry.define(tagName, CustomElementClass);
        const shadowRoot = getShadowRoot(registry);

        const $el = document.createElement(tagName, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($el).to.not.be.undefined;
        expect($el).to.be.instanceof(CustomElementClass);
      });
    });

    describe('innerHTML', () => {
      it(`shouldn't upgrade a defined custom element in the global registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);

        shadowRoot.innerHTML = `<${tagName}></${tagName}>`;

        expect(shadowRoot.firstElementChild).to.not.be.instanceof(
          CustomElementClass
        );
      });

      it('should upgrade a defined custom element in the custom registry', () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        registry.define(tagName, CustomElementClass);
        const shadowRoot = getShadowRoot(registry);

        shadowRoot.innerHTML = `<${tagName}></${tagName}>`;

        expect(shadowRoot.firstElementChild).to.be.instanceof(
          CustomElementClass
        );
      });
    });

    describe('importNode', () => {
      it('should import a basic node', () => {
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);
        const html = '<span>sample</span>';
        const $div = getHTML(html);

        const $clone = document.importNode($div, {
          customElementRegistry: shadowRoot.customELements,
        });

        expect($clone.outerHTML).to.be.equal(html);
      });

      it('should maintain registry on the cloned node', () => {
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);
        document.createElement('div', {
          customElementRegistry: shadowRoot.customElementRegistry,
        });
        shadowRoot.innerHTML = '<div></div>';
        const globalDiv = document.createElement('div');
        shadowRoot.appendChild(globalDiv);
        const div1 = shadowRoot.firstElementChild;
        const div2 = shadowRoot.lastElementChild;
        const clone1 = document.importNode(div1, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });
        const clone2 = document.importNode(div2, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });
        expect(clone1.customElementRegistry).to.be.equal(
          div1.customElementRegistry
        );
        expect(clone2.customElementRegistry).to.be.equal(
          div2.customElementRegistry
        );
      });

      it('should import a node tree with an upgraded custom elements matching source registry', () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);

        const registry = new CustomElementRegistry();
        const AnotherCustomElementClass = class extends HTMLElement {};
        registry.define(tagName, AnotherCustomElementClass);

        const shadowRoot = getShadowRoot(registry);
        const el1 = getHTML(`<${tagName}></${tagName}>`, shadowRoot);
        const el2 = document.createElement(tagName);
        el1.append(el2);
        const clone1 = document.importNode(el1, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });
        const clone2 = clone1.firstElementChild;
        expect(clone1.customElementRegistry).to.be.equal(
          el1.customElementRegistry
        );
        expect(clone2.customElementRegistry).to.be.equal(
          el2.customElementRegistry
        );
        expect(clone1).to.be.instanceof(AnotherCustomElementClass);
        expect(clone2).to.be.instanceof(CustomElementClass);
      });

      it('should import a node tree with an upgraded custom element from another shadowRoot', () => {
        const {tagName, CustomElementClass} = getTestElement();
        const firstRegistry = new CustomElementRegistry();
        firstRegistry.define(tagName, CustomElementClass);

        const firstShadowRoot = getShadowRoot(firstRegistry);
        const $el = getHTML(`<${tagName}></${tagName}>`, firstShadowRoot);
        const secondRegistry = new CustomElementRegistry();
        const AnotherCustomElementClass = class extends HTMLElement {};
        secondRegistry.define(tagName, AnotherCustomElementClass);
        const secondShadowRoot = getShadowRoot(secondRegistry);

        const $clone = document.importNode($el, {
          customElementRegistry: secondShadowRoot.customElementRegistry,
        });
        expect($clone.customElementRegistry).to.be.equal(
          $el.customElementRegistry
        );
        expect($clone).to.be.instanceof(CustomElementClass);
        expect($clone).not.to.be.instanceof(AnotherCustomElementClass);
      });

      it('should import a node tree with a non upgraded custom element', () => {
        const tagName = getTestTagName();
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);
        const $el = getHTML(`<${tagName}></${tagName}>`);

        const $clone = document.importNode($el, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone.outerHTML).to.be.equal(`<${tagName}></${tagName}>`);
      });

      it('should import a node tree with a non upgraded custom element defined in the custom registry', () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        registry.define(tagName, CustomElementClass);

        const shadowRoot = getShadowRoot(registry);
        const $el = getHTML(`<${tagName}></${tagName}>`, shadowRoot);

        const $clone = document.importNode($el, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone).to.be.instanceof(CustomElementClass);
      });

      it('should import a template with an undefined custom element', () => {
        const {tagName} = getTestTagName();
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);
        const $template = createTemplate(`<${tagName}></${tagName}>`);

        const $clone = document.importNode($template.content, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone).to.be.instanceof(DocumentFragment);
        expect($clone.firstElementChild.outerHTML).to.be.equal(
          `<${tagName}></${tagName}>`
        );
      });

      it('should import a template with a defined custom element', () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        const shadowRoot = getShadowRoot(registry);
        const $template = createTemplate(`<${tagName}></${tagName}>`);
        registry.define(tagName, CustomElementClass);

        const $clone = document.importNode($template.content, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone).to.be.instanceof(DocumentFragment);
        expect($clone.firstElementChild.outerHTML).to.be.equal(
          `<${tagName}></${tagName}>`
        );
        expect($clone.firstElementChild).to.be.instanceof(CustomElementClass);
      });
    });
  });

  describe('without custom registry', () => {
    describe('createElement', () => {
      it('should create a regular element', () => {
        const shadowRoot = getShadowRoot();

        const $el = document.createElement('div', {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($el).to.not.be.undefined;
        expect($el).to.be.instanceof(HTMLDivElement);
      });

      it(`should upgrade an element defined in the global registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);
        const shadowRoot = getShadowRoot();

        const $el = document.createElement(tagName, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($el).to.not.be.undefined;
        expect($el).to.be.instanceof(CustomElementClass);
      });
    });

    describe('innerHTML', () => {
      it(`shouldn't upgrade a defined custom element in a custom registry`, () => {
        const {tagName, CustomElementClass} = getTestElement();
        const registry = new CustomElementRegistry();
        registry.define(tagName, CustomElementClass);
        const shadowRoot = getShadowRoot();

        shadowRoot.innerHTML = `<${tagName}></${tagName}>`;

        expect(shadowRoot.firstElementChild).to.not.be.instanceof(
          CustomElementClass
        );
      });

      it('should upgrade a defined custom element in the global registry', () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);
        const shadowRoot = getShadowRoot();

        shadowRoot.innerHTML = `<${tagName}></${tagName}>`;

        expect(shadowRoot.firstElementChild).to.be.instanceof(
          CustomElementClass
        );
      });
    });

    describe('importNode', () => {
      it('should import a basic node', () => {
        const shadowRoot = getShadowRoot();
        const html = '<span>sample</span>';
        const $div = getHTML(html);

        const $clone = document.importNode($div, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone.outerHTML).to.be.equal(html);
      });

      it('should import a node tree with an upgraded custom element', () => {
        const {tagName, CustomElementClass} = getTestElement();
        customElements.define(tagName, CustomElementClass);

        const shadowRoot = getShadowRoot();
        const $el = getHTML(`<${tagName}></${tagName}>`);

        const $clone = document.importNode($el, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone.outerHTML).to.be.equal(`<${tagName}></${tagName}>`);
        expect($clone).to.be.instanceof(CustomElementClass);
      });

      it('should import a node tree with an upgraded custom element from another shadowRoot', () => {
        const {tagName, CustomElementClass} = getTestElement();
        const firstRegistry = new CustomElementRegistry();
        firstRegistry.define(tagName, CustomElementClass);

        const firstShadowRoot = getShadowRoot(firstRegistry);
        const $el = getHTML(`<${tagName}></${tagName}>`, firstShadowRoot);
        const secondShadowRoot = getShadowRoot();

        const $clone = document.importNode($el, {
          customElementRegistry: secondShadowRoot.customElementRegistry,
        });

        expect($clone.outerHTML).to.be.equal($el.outerHTML);
      });

      it('should import a node tree with a non upgraded custom element', () => {
        const tagName = getTestTagName();
        const shadowRoot = getShadowRoot();
        const $el = getHTML(`<${tagName}></${tagName}>`);

        const $clone = document.importNode($el, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone.outerHTML).to.be.equal(`<${tagName}></${tagName}>`);
      });

      it('should import a template with an undefined custom element', () => {
        const {tagName} = getTestTagName();
        const shadowRoot = getShadowRoot();
        const $template = createTemplate(`<${tagName}></${tagName}>`);

        const $clone = document.importNode($template.content, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone).to.be.instanceof(DocumentFragment);
        expect($clone.firstElementChild.outerHTML).to.be.equal(
          `<${tagName}></${tagName}>`
        );
      });

      it('should import a template with a defined custom element', () => {
        const {tagName, CustomElementClass} = getTestElement();
        const shadowRoot = getShadowRoot();
        const $template = createTemplate(`<${tagName}></${tagName}>`);
        customElements.define(tagName, CustomElementClass);

        const $clone = document.importNode($template.content, {
          customElementRegistry: shadowRoot.customElementRegistry,
        });

        expect($clone).to.be.instanceof(DocumentFragment);
        expect($clone.firstElementChild.outerHTML).to.be.equal(
          `<${tagName}></${tagName}>`
        );
        expect($clone.firstElementChild).to.be.instanceof(CustomElementClass);
      });
    });
  });
});
