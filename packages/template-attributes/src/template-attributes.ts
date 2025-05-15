/**
 * @license
 * Copyright (c) 2025 The Polymer Project Authors. All rights reserved. This
 * code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

class CustomHTMLElement extends HTMLElement {
  private _templates: DOMStringMap = {};
  private _templatesObserver: MutationObserver = new MutationObserver(
    this._templatesCallback.bind(this)
  );
  // Use MutationObserver to keep a record of all nodes that contain a `template-` attribute.
  // Faster than running querySelector() every time `templates` is set.
  #templateAttributeElements: Set<Element> = new Set();
  #templateHandler: ProxyHandler<DOMStringMap> = {
    get: (target, prop) => {
      if (prop in target) {
        return target[String(prop)];
      }
      return undefined;
    },
    set: (target, prop, value) => {
      target[String(prop)] = value;
      queueMicrotask(() => {
        this.#propagateChange(String(prop), value);
      });
      return true;
    },
    deleteProperty: (target, prop) => {
      if (prop in target) {
        delete target[String(prop)];
        queueMicrotask(() => {
          this.#propagateChange(String(prop), '');
        });
        return true;
      }
      return false;
    },
  };

  get templates(): DOMStringMap {
    return this._templates;
  }

  attachShadow(init: ShadowRootInit): ShadowRoot {
    const ret = super.attachShadow(init);
    this._templatesObserver.observe(this, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    this._scanAttributes(this);
    if (this.shadowRoot) {
      this._templatesObserver.observe(this.shadowRoot, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      for (const child of this.shadowRoot.children) {
        this._scanAttributes(child);
      }
    }
    this._templates = new Proxy({}, this.#templateHandler);
    return ret;
  }

  #propagateChange(propertyName: string, value: unknown) {
    for (const el of this.#templateAttributeElements) {
      for (const attr of el.attributes) {
        if (attr.name.startsWith('template-') && attr.value === propertyName) {
          const lowerCaseName = attr.name.replace(/^template-/, '');

          for (const attrName in el) {
            if (attrName.toLowerCase() === lowerCaseName) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (el as Record<string, any>)[attrName] = String(value);
              break;
            }
          }
          break;
        }
      }
    }
  }

  _templatesCallback(mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName?.startsWith('template-')
      ) {
        this.#templateAttributeElements.add(mutation.target as Element);
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this._scanAttributes(node as Element);
          }
        });
      }
    }
  }

  private _scanAttributes(node: Element) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of node.attributes) {
        if (attr.name.startsWith('template-')) {
          if (!this.#templateAttributeElements.has(node)) {
            this.#templateAttributeElements.add(node);
            break;
          }
        }
      }
    }
    for (const child of node.children) {
      this._scanAttributes(child);
    }
  }
}

if (!HTMLElement.prototype.hasOwnProperty('templates')) {
  window[
    'HTMLElement'
  ] = (CustomHTMLElement as unknown) as typeof window['HTMLElement'];
}
