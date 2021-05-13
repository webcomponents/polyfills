import {expect} from '@open-wc/testing';

import {commonRegistryTests} from './common-registry-tests.js';
import {getShadowRoot, getTestElement, getTestTagName} from './utils.js';

describe('Scoped Registry', () => {
  commonRegistryTests(new CustomElementRegistry());

  it('should be constructable', () => {
    const registry = new CustomElementRegistry();

    expect(registry).to.not.be.undefined;
  });

  it(`shouldn't inherit from global registry`, () => {
    const {tagName, CustomElementClass} = getTestElement();
    customElements.define(tagName, CustomElementClass);
    const shadowRoot = getShadowRoot(new CustomElementRegistry());

    shadowRoot.innerHTML = `<${tagName}></${tagName}>`;

    expect(shadowRoot.firstElementChild).to.be.instanceof(HTMLElement);
    expect(shadowRoot.firstElementChild).to.not.be.instanceof(
      CustomElementClass
    );
  });

  it('should be able to be shared between different shadowRoots', () => {
    const registry = new CustomElementRegistry();
    const firstShadowRoot = getShadowRoot(registry);
    const secondShadowRoot = getShadowRoot(registry);
    const {tagName, CustomElementClass} = getTestElement();
    registry.define(tagName, CustomElementClass);

    firstShadowRoot.innerHTML = `<${tagName}></${tagName}>`;
    secondShadowRoot.innerHTML = `<${tagName}></${tagName}>`;

    expect(firstShadowRoot.firstElementChild).to.not.be.equal(
      secondShadowRoot.firstElementChild
    );
    expect(firstShadowRoot.firstElementChild).to.be.instanceof(
      CustomElementClass
    );
    expect(secondShadowRoot.firstElementChild).to.be.instanceof(
      CustomElementClass
    );
  });

  describe('custom element constructors', () => {
    it('should throw if the constructor is not defined in the global registry', () => {
      const {tagName, CustomElementClass} = getTestElement();
      const registry = new CustomElementRegistry();
      registry.define(tagName, CustomElementClass);

      expect(() => new CustomElementClass()).to.throw();
    });

    it('should allow defining in global registry and scoped registery', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const tagName = getTestTagName();
      class CustomElementClass extends HTMLElement {
        static get observedAttributes() {
          return ['attr'];
        }
        connectedCallback() {
          this.connected = true;
        }
        attributeChangedCallback(name, old, val) {
          this.attributeChanged = `${name}:${val}`;
        }
      }

      // Define in global registry first
      customElements.define(tagName, CustomElementClass);
      container.innerHTML = `<${tagName} attr="doc"></${tagName}`;
      const docEl = container.firstChild;
      expect(docEl).to.be.instanceOf(CustomElementClass);
      expect(docEl.connected).to.be.true;
      expect(docEl.attributeChanged).to.equal('attr:doc');

      // Create scoped element, then upgrade via scoped registry
      const registry = new CustomElementRegistry();
      const shadowRoot = getShadowRoot(registry);
      document.body.appendChild(shadowRoot.host);
      shadowRoot.innerHTML = `<${tagName} attr="scoped"></${tagName}`;
      const scopedEl = shadowRoot.firstChild;
      registry.define(tagName, CustomElementClass);
      expect(scopedEl).to.be.instanceOf(CustomElementClass);
      expect(scopedEl.connected).to.be.true;
      expect(scopedEl.attributeChanged).to.equal('attr:scoped');

      document.body.removeChild(container);
      document.body.removeChild(shadowRoot.host);
    });
  });
});
