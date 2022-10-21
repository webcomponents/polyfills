require('../../scoped-custom-element-registry.min.js');

test('`CustomElementRegistry` is constructable.', () => {
  new CustomElementRegistry();
});

test('Shadow roots with different registries can contain different definitions for the same tag name.', () => {
  const registry1 = new CustomElementRegistry();
  class SomeElement1 extends HTMLElement {}
  registry1.define('some-element', SomeElement1);
  const div1 = document.createElement('div');
  div1.attachShadow({mode: 'open', customElements: registry1});

  const registry2 = new CustomElementRegistry();
  class SomeElement2 extends HTMLElement {}
  registry2.define('some-element', SomeElement2);
  const div2 = document.createElement('div');
  div2.attachShadow({mode: 'open', customElements: registry2});

  expect(div1.shadowRoot.createElement('some-element')).toBeInstanceOf(SomeElement1);
  expect(div2.shadowRoot.createElement('some-element')).toBeInstanceOf(SomeElement2);
});
