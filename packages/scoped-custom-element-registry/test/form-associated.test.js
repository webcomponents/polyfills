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
          expect(form.elements[name].includes(element)).to.be.true;
          expect(form.elements[name].includes(element2)).to.be.true;
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
    it('is formAssociated if set in CustomElementRegistryPolyfill.formAssociated', () => {
      const tagName = getTestTagName();
      window.CustomElementRegistryPolyfill.formAssociated.add(tagName);
      class El extends HTMLElement {}
      customElements.define(tagName, El);
      expect(customElements.get(tagName).formAssociated).to.be.true;
    });
    it('is always formAssociated if first defined tag is formAssociated', () => {
      const tagName = getTestTagName();
      class FormAssociatedEl extends HTMLElement {
        static formAssociated = true;
      }
      class El extends HTMLElement {}
      customElements.define(tagName, FormAssociatedEl);
      const registry = new CustomElementRegistry();
      registry.define(tagName, El);
      expect(customElements.get(tagName).formAssociated).to.be.true;
      expect(registry.get(tagName).formAssociated).to.be.true;
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
