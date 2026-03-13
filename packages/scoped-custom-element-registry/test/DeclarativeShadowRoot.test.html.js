import {expect} from '@open-wc/testing';

describe('Declarative ShadowRoot', () => {
  it(
    `should be browser ${navigator.userAgent} and polyfill ${JSON.stringify(
      window.CustomElementRegistryPolyfill
    )}`
  ),
    () => {};

  it('should customize elements in global registry', () => {
    const host = document.getElementById('host1');
    expect(host.shadowRoot).not.to.be.null;
    expect(host.shadowRoot.customElementRegistry).to.be.equal(
      window.customElements
    );
    const ce = host.shadowRoot.firstElementChild;
    expect(ce.customElementRegistry).to.be.equal(window.customElements);
    expect(ce).to.be.instanceOf(customElements.get(ce.localName));
  });

  it('should *not* customize elements in null registry', () => {
    const host = document.getElementById('host2');
    expect(host.shadowRoot).not.to.be.null;
    expect(host.shadowRoot.customElementRegistry).to.be.null;
    const ce = host.shadowRoot.firstElementChild;
    expect(ce.customElementRegistry).to.be.null;
    expect(ce).not.to.be.instanceOf(customElements.get(ce.localName));
  });

  it('should customize when registry initializes', () => {
    const host = document.getElementById('host2');
    const registry = new CustomElementRegistry();
    class RegistryDsdElement extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({
          mode: 'open',
        }).innerHTML = `${this.localName}: scoped`;
      }
    }
    registry.define('dsd-element', RegistryDsdElement);
    registry.initialize(host.shadowRoot);
    expect(host.shadowRoot.customElementRegistry).to.be.equal(registry);
    const ce = host.shadowRoot.firstElementChild;
    expect(ce.customElementRegistry).to.be.equal(registry);
    expect(ce).to.be.instanceOf(RegistryDsdElement);
  });
});
