import {expect} from '@open-wc/testing';

import {commonRegistryTests} from './common-registry-tests.js';
import {getShadowRoot, getTestElement} from './utils.js';

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
  });

  describe('whenDefined', () => {
    it('should resolve whenDefined when defined after calling whenDefined', async () => {
      const registry = new CustomElementRegistry();
      const {tagName, CustomElementClass} = getTestElement();
      const whenDefined = registry.whenDefined(tagName);
      registry.define(tagName, CustomElementClass);
      const ctor = await whenDefined;
      expect(ctor).to.equal(CustomElementClass);
    });

    it('should resolve whenDefined when defined before calling whenDefined', async () => {
      const registry = new CustomElementRegistry();
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);
      const ctor = await registry.whenDefined(tagName);
      expect(ctor).to.equal(CustomElementClass);
    });
  });
});
