import {expect} from '@open-wc/testing';

import {
  getTestTagName,
  getTestElement,
  getFormAssociatedTestElement,
  getFormAssociatedErrorTestElement,
} from './utils';

const supportsFACE =
  !!window['ElementInternals'] &&
  !!window['ElementInternals'].prototype['setFormValue'];

export const commonRegistryTests = (registry) => {
  if (supportsFACE) {
    describe('Form associated custom elements', () => {
      describe('participating elements', () => {
        it('should still be able to participate in a form', async () => {
          const {tagName, CustomElementClass} = getFormAssociatedTestElement();
          registry.define(tagName, CustomElementClass);

          const form = document.createElement('form');
          const element = new CustomElementClass();
          element.setAttribute('name', 'form-associated');
          form.append(element);

          expect(() => {
            form.append(element);
          }).not.to.throw;
          expect(new FormData(form).get(element.getAttribute('name'))).to.equal(
            'FACE'
          );
        });

        it('should still be able to participate in a form as a RadioGroup', async () => {
          const {tagName, CustomElementClass} = getFormAssociatedTestElement();
          registry.define(tagName, CustomElementClass);

          const form = document.createElement('form');
          const element = new CustomElementClass();
          const element2 = new CustomElementClass();
          const name = 'form-associated';

          element.setAttribute('name', name);
          element2.setAttribute('name', name);
          form.append(element);
          form.append(element2);
          document.body.append(form);
          expect(Array.from(form.elements[name]).includes(element)).to.be.true;
          expect(Array.from(form.elements[name]).includes(element2)).to.be.true;
          expect(form.elements[name].value).to.equal('');
        });

        it('should be present in form.elements', async () => {
          const {tagName, CustomElementClass} = getFormAssociatedTestElement();
          registry.define(tagName, CustomElementClass);

          const form = document.createElement('form');
          const element = new CustomElementClass();
          element.setAttribute('name', 'form-associated');
          form.append(element);

          expect(form.elements[0], 'by index key').to.equal(element);
          expect(form.elements['form-associated'], 'by control name').to.equal(
            element
          );
          expect(
            form.elements.namedItem('form-associated'),
            'by namedItem'
          ).to.equal(element);
          expect(form.elements.length).to.equal(1);
        });
      });
    });

    describe('Form associated elements that should throw', () => {
      it('should throw an error if not explicitly form associated', () => {
        const {
          tagName,
          CustomElementClass,
        } = getFormAssociatedErrorTestElement();
        registry.define(tagName, CustomElementClass);

        expect(() => {
          new CustomElementClass();
        }).to.throw(DOMException);
      });
    });
  }

  describe('Form elements should only include form associated elements', () => {
    it('will not include non form-associated elements', () => {
      const {tagName, CustomElementClass} = getTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();
      form.append(element);

      expect(form.elements.length).to.equal(0);
    });
  });

  describe('ElementInternals prototype method overrides', () => {
    it('will still return the appropriate values', () => {
      const {tagName, CustomElementClass} = getFormAssociatedTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();

      form.append(element);

      expect(element.internals.checkValidity()).to.be.true;

      element.internals.setValidity({valueMissing: true}, 'Test');

      expect(element.internals.checkValidity()).to.be.false;
    });
  });

  describe('formAssociated scoping limitations', () => {
    // Note, the browser only knows one class per tag, so whether it can be
    // form-associated is fixed by the tag's first definition, or reserved in
    // CustomElementRegistryPolyfill.formAssociated.
    it('a tag reserved in CustomElementRegistryPolyfill.formAssociated can be form-associated in a later definition', function () {
      if (!window.CustomElementRegistryPolyfill.inUse) {
        this.skip();
      }
      const tagName = getTestTagName();
      window.CustomElementRegistryPolyfill.formAssociated.add(tagName);
      customElements.define(tagName, class extends HTMLElement {});
      const registry = new CustomElementRegistry();
      registry.define(
        tagName,
        class extends HTMLElement {
          static formAssociated = true;
        }
      );
      const internals = document
        .createElement(tagName, {customElementRegistry: registry})
        .attachInternals();
      expect(() => internals.setFormValue('value')).not.to.throw();
    });
  });

  describe('When formAssociated is not set', () => {
    it('should not prevent clicks when disabled', () => {
      const {tagName, CustomElementClass} = getTestElement();
      customElements.define(tagName, CustomElementClass);
      const el = document.createElement(tagName);
      let clicked = false;
      el.setAttribute('disabled', '');
      el.addEventListener('click', () => (clicked = true));
      el.click();
      expect(clicked).to.be.true;
    });
  });
};
