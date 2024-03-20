import { aTimeout, expect, fixture } from '@open-wc/testing';

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
      describe('which respects the value set on the real class webcomponent', () => {
        it('should act as an element associated with a form if formAssociated getter is set and trigger click event when not disabled', async () => {
          const tagName = getTestTagName();

          // helper function to test if the event executed or not
          let numberOfCalls = 0;
          const callOnce = () => {
            numberOfCalls++;
          }

          class CustomElementClass extends HTMLElement {
            static get formAssociated() {
              return true;
            }

            connectedCallback() {
              this.addEventListener('click', () => callOnce());
            }
          }

          customElements.define(tagName, CustomElementClass);

          // declare the component without adding disabled attribute to test that the element does receive the click event when it is formAssociated
          const el = await fixture(`<${tagName}></${tagName}>`);

          setTimeout(() => el.click());

          // wait small timeout (not ideal) for the function to be executed
          await aTimeout(100);

          expect(numberOfCalls).to.be.equal(1);
        });

        it('should act as an element associated with a form if formAssociated getter is set and not trigger click event when it is disabled', async () => {
          const tagName = getTestTagName();

          // helper function to test if the event executed or not
          let numberOfCalls = 0;
          const callOnce = () => {
            numberOfCalls++;
          }

          class CustomElementClass extends HTMLElement {
            static get formAssociated() {
              return true;
            }

            connectedCallback() {
              this.addEventListener('click', () => callOnce());
            }
          }

          customElements.define(tagName, CustomElementClass);

          // make component disabled to test that the element not receives the click event when it is formAssociated
          const el = await fixture(`<${tagName} disabled></${tagName}>`);

          setTimeout(() => el.click());

          // wait small timeout (not ideal) for the function to be executed
          await aTimeout(100);

          expect(numberOfCalls).to.be.equal(0);
        });

        it('should not act as an element associated with a form if formAssociated getter is not set', async () => {
          const tagName = getTestTagName();
          let numberOfCalls = 0;
          const callOnce = () => {
            numberOfCalls++;
          }
          class CustomElementClass extends HTMLElement {
            connectedCallback() {
              this.addEventListener('click', () => callOnce());
            }
          }

          customElements.define(tagName, CustomElementClass);

          // make component disabled to test that the element receives the click event
          const el = await fixture(`<${tagName} disabled></${tagName}>`);

          setTimeout(() => el.click());

          // wait small timeout (not ideal) for the function to be executed
          await aTimeout(100);

          expect(numberOfCalls).to.be.equal(1);
        });
      });

      describe('participating elements', () => {
        it('should still be able to participate in a form', async () => {
          const { tagName, CustomElementClass } = getFormAssociatedTestElement();
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
          const { tagName, CustomElementClass } = getFormAssociatedTestElement();
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
          const { tagName, CustomElementClass } = getFormAssociatedTestElement();
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
      const { tagName, CustomElementClass } = getTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();
      form.append(element);

      expect(form.elements.length).to.equal(0);
    });
  });

  describe('ElementInternals prototype method overrides', () => {
    it('will still return the appropriate values', () => {
      const { tagName, CustomElementClass } = getFormAssociatedTestElement();
      registry.define(tagName, CustomElementClass);

      const form = document.createElement('form');
      const element = new CustomElementClass();

      form.append(element);

      expect(element.internals.checkValidity()).to.be.true;

      element.internals.setValidity({ valueMissing: true }, 'Test');

      expect(element.internals.checkValidity()).to.be.false;
    });
  });
};
