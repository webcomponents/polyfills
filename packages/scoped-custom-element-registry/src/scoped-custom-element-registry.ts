/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

interface CustomElementConstructor {
  observedAttributes?: Array<string>;
  formAssociated?: boolean;

  new (...params: unknown[]): CustomHTMLElement;
}

interface CustomHTMLElement {
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  adoptedCallback?(): void;
  attributeChangedCallback?(
    name: string,
    oldValue?: string | null,
    newValue?: string | null,
    namespace?: string | null
  ): void;
  formAssociatedCallback?(form: HTMLFormElement | null): void;
  formDisabledCallback?(disabled: boolean): void;
  formResetCallback?(): void;
  formStateRestoreCallback?(
    state: File | string | FormData | null,
    mode: string
  ): void;
}

interface CustomElementRegistry {
  _getDefinition(tagName: string): CustomElementDefinition | undefined;
}

interface CustomElementDefinition {
  elementClass: CustomElementConstructor;
  connectedCallback?: CustomHTMLElement['connectedCallback'];
  disconnectedCallback?: CustomHTMLElement['disconnectedCallback'];
  adoptedCallback?: CustomHTMLElement['adoptedCallback'];
  attributeChangedCallback?: CustomHTMLElement['attributeChangedCallback'];
  formAssociated?: boolean;
  formAssociatedCallback?: CustomHTMLElement['formAssociatedCallback'];
  formDisabledCallback?: CustomHTMLElement['formDisabledCallback'];
  formResetCallback?: CustomHTMLElement['formResetCallback'];
  formStateRestoreCallback?: CustomHTMLElement['formStateRestoreCallback'];
  observedAttributes: Set<string>;
  standInClass?: CustomElementConstructor;
}

interface ShadowRootWithSettableCustomElements extends ShadowRoot {
  customElements?: CustomElementRegistry;
}

type ParametersOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ((...args: any) => any) | undefined
> = T extends Function ? Parameters<T> : never;

if (!ShadowRoot.prototype.createElement) {
  const NativeHTMLElement = window.HTMLElement;
  const nativeDefine = window.customElements.define;
  const nativeGet = window.customElements.get;
  const nativeRegistry = window.customElements;

  const definitionForElement = new WeakMap<
    HTMLElement,
    CustomElementDefinition
  >();
  const pendingRegistryForElement = new WeakMap<
    HTMLElement,
    ShimmedCustomElementsRegistry
  >();
  const globalDefinitionForConstructor = new WeakMap<
    CustomElementConstructor,
    CustomElementDefinition
  >();
  // TBD: This part of the spec proposal is unclear:
  // > Another option for looking up registries is to store an element's
  // > originating registry with the element. The Chrome DOM team was concerned
  // > about the small additional memory overhead on all elements. Looking up the
  // > root avoids this.
  const scopeForElement = new WeakMap<Node, Element | ShadowRoot>();

  class AsyncInfo<T> {
    readonly promise: Promise<T>;
    readonly resolve: (val: T) => void;
    constructor() {
      let resolve;
      this.promise = new Promise<T>((r) => {
        resolve = r;
      });
      this.resolve = resolve!;
    }
  }

  // Constructable CE registry class, which uses the native CE registry to
  // register stand-in elements that can delegate out to CE classes registered
  // in scoped registries
  class ShimmedCustomElementsRegistry implements CustomElementRegistry {
    private _definitionsByTag = new Map<string, CustomElementDefinition>();
    private _definitionsByClass = new Map<
      CustomElementConstructor,
      CustomElementDefinition
    >();
    private _whenDefinedPromises = new Map<
      string,
      AsyncInfo<CustomElementConstructor>
    >();
    private _awaitingUpgrade = new Map<string, Set<HTMLElement>>();

    define(tagName: string, elementClass: CustomElementConstructor) {
      tagName = tagName.toLowerCase();
      if (this._getDefinition(tagName) !== undefined) {
        throw new DOMException(
          `Failed to execute 'define' on 'CustomElementRegistry': the name "${tagName}" has already been used with this registry`
        );
      }
      if (this._definitionsByClass.get(elementClass) !== undefined) {
        throw new DOMException(
          `Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry`
        );
      }
      // Since observedAttributes can't change, we approximate it by patching
      // set/remove/toggleAttribute on the user's class
      const attributeChangedCallback =
        elementClass.prototype.attributeChangedCallback;
      const observedAttributes = new Set<string>(
        elementClass.observedAttributes || []
      );
      patchAttributes(
        elementClass,
        observedAttributes,
        attributeChangedCallback
      );
      // Register the definition
      const definition: CustomElementDefinition = {
        elementClass,
        connectedCallback: elementClass.prototype.connectedCallback,
        disconnectedCallback: elementClass.prototype.disconnectedCallback,
        adoptedCallback: elementClass.prototype.adoptedCallback,
        attributeChangedCallback,
        'formAssociated': elementClass['formAssociated'],
        'formAssociatedCallback':
          elementClass.prototype['formAssociatedCallback'],
        'formDisabledCallback': elementClass.prototype['formDisabledCallback'],
        'formResetCallback': elementClass.prototype['formResetCallback'],
        'formStateRestoreCallback':
          elementClass.prototype['formStateRestoreCallback'],
        observedAttributes,
      };
      this._definitionsByTag.set(tagName, definition);
      this._definitionsByClass.set(elementClass, definition);
      // Register a stand-in class which will handle the registry lookup & delegation
      let standInClass = nativeGet.call(nativeRegistry, tagName);
      if (!standInClass) {
        standInClass = createStandInElement(tagName);
        nativeDefine.call(nativeRegistry, tagName, standInClass);
      }
      if (this === window.customElements) {
        globalDefinitionForConstructor.set(elementClass, definition);
        definition.standInClass = standInClass;
      }
      // Upgrade any elements created in this scope before define was called
      const awaiting = this._awaitingUpgrade.get(tagName);
      if (awaiting) {
        this._awaitingUpgrade.delete(tagName);
        for (const element of awaiting) {
          pendingRegistryForElement.delete(element);
          customize(element, definition, true);
        }
      }
      // Flush whenDefined callbacks
      const info = this._whenDefinedPromises.get(tagName);
      if (info !== undefined) {
        info.resolve(elementClass);
        this._whenDefinedPromises.delete(tagName);
      }
      return elementClass;
    }

    upgrade(...args: Parameters<CustomElementRegistry['upgrade']>) {
      creationContext.push(this);
      nativeRegistry.upgrade(...args);
      creationContext.pop();
    }

    get(tagName: string) {
      const definition = this._definitionsByTag.get(tagName);
      return definition?.elementClass;
    }

    _getDefinition(tagName: string) {
      return this._definitionsByTag.get(tagName);
    }

    whenDefined(tagName: string) {
      const definition = this._getDefinition(tagName);
      if (definition !== undefined) {
        return Promise.resolve(definition.elementClass);
      }
      let info = this._whenDefinedPromises.get(tagName);
      if (info === undefined) {
        info = new AsyncInfo<CustomElementConstructor>();
        this._whenDefinedPromises.set(tagName, info);
      }
      return info.promise;
    }

    _upgradeWhenDefined(
      element: HTMLElement,
      tagName: string,
      shouldUpgrade: boolean
    ) {
      let awaiting = this._awaitingUpgrade.get(tagName);
      if (!awaiting) {
        this._awaitingUpgrade.set(tagName, (awaiting = new Set<HTMLElement>()));
      }
      if (shouldUpgrade) {
        awaiting.add(element);
      } else {
        awaiting.delete(element);
      }
    }
  }

  // User extends this HTMLElement, which returns the CE being upgraded
  let upgradingInstance: HTMLElement | undefined;
  window.HTMLElement = (function HTMLElement(this: HTMLElement) {
    // Upgrading case: the StandInElement constructor was run by the browser's
    // native custom elements and we're in the process of running the
    // "constructor-call trick" on the natively constructed instance, so just
    // return that here
    let instance = upgradingInstance;
    if (instance) {
      upgradingInstance = undefined;
      return instance;
    }
    // Construction case: we need to construct the StandInElement and return
    // it; note the current spec proposal only allows new'ing the constructor
    // of elements registered with the global registry
    const definition = globalDefinitionForConstructor.get(
      this.constructor as CustomElementConstructor
    );
    if (!definition) {
      throw new TypeError(
        'Illegal constructor (custom element class must be registered with global customElements registry to be newable)'
      );
    }
    instance = Reflect.construct(
      NativeHTMLElement,
      [],
      definition.standInClass
    );
    Object.setPrototypeOf(instance, this.constructor.prototype);
    definitionForElement.set(instance!, definition);
    return instance;
  } as unknown) as typeof HTMLElement;
  window.HTMLElement.prototype = NativeHTMLElement.prototype;

  // Helpers to return the scope for a node where its registry would be located
  const isValidScope = (node: Node) =>
    node === document || node instanceof ShadowRoot;
  const registryForNode = (
    node: Node
  ): ShimmedCustomElementsRegistry | null => {
    // TODO: the algorithm for finding the scope is a bit up in the air; assigning
    // a one-time scope at creation time would require walking every tree ever
    // created, which is avoided for now
    let scope = node.getRootNode();
    // If we're not attached to the document (i.e. in a disconnected tree or
    // fragment), we need to get the scope from the creation context; that should
    // be a Document or ShadowRoot, unless it was created via innerHTML
    if (!isValidScope(scope)) {
      const context = creationContext[creationContext.length - 1];
      // When upgrading via registry.upgrade(), the registry itself is put on the
      // creationContext stack
      if (context instanceof CustomElementRegistry) {
        return context as ShimmedCustomElementsRegistry;
      }
      // Otherwise, get the root node of the element this was created from
      scope = context.getRootNode();
      // The creation context wasn't a Document or ShadowRoot or in one; this
      // means we're being innerHTML'ed into a disconnected element; for now, we
      // hope that root node was created imperatively, where we stash _its_
      // scopeForElement. Beyond that, we'd need more costly tracking.
      if (!isValidScope(scope)) {
        scope = scopeForElement.get(scope)?.getRootNode() || document;
      }
    }
    // TODO (justinfagnani): I don't think this matches the proposal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (scope as any)
      .customElements as ShimmedCustomElementsRegistry | null;
  };

  // Helper to create stand-in element for each tagName registered that delegates
  // out to the registry for the given element
  const createStandInElement = (tagName: string): CustomElementConstructor => {
    return (class ScopedCustomElementBase {
      static get ['formAssociated']() {
        return true;
      }
      constructor() {
        // Create a raw HTMLElement first
        const instance = Reflect.construct(
          NativeHTMLElement,
          [],
          this.constructor
        );
        // We need to install the minimum HTMLElement prototype so that
        // scopeForNode can use DOM API to determine our construction scope;
        // upgrade will eventually install the full CE prototype
        Object.setPrototypeOf(instance, HTMLElement.prototype);
        // Get the node's scope, and its registry (falls back to global registry)
        const registry =
          registryForNode(instance) ||
          (window.customElements as ShimmedCustomElementsRegistry);
        const definition = registry._getDefinition(tagName);
        if (definition) {
          customize(instance, definition);
        } else {
          pendingRegistryForElement.set(instance, registry);
        }
        return instance;
      }

      connectedCallback(
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['connectedCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition) {
          // Delegate out to user callback
          definition.connectedCallback &&
            definition.connectedCallback.apply(this, args);
        } else {
          // Register for upgrade when defined (only when connected, so we don't leak)
          pendingRegistryForElement
            .get(this)!
            ._upgradeWhenDefined(this, tagName, true);
        }
      }

      disconnectedCallback(
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['connectedCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition) {
          // Delegate out to user callback
          definition.disconnectedCallback &&
            definition.disconnectedCallback.apply(this, args);
        } else {
          // Un-register for upgrade when defined (so we don't leak)
          pendingRegistryForElement
            .get(this)!
            ._upgradeWhenDefined(this, tagName, false);
        }
      }

      adoptedCallback(
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['adoptedCallback']>
      ) {
        const definition = definitionForElement.get(this);
        definition?.adoptedCallback?.apply(this, args);
      }

      // Form-associated custom elements lifecycle methods
      ['formAssociatedCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formAssociatedCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition?.['formAssociated']) {
          definition?.['formAssociatedCallback']?.apply(this, args);
        }
      }

      ['formDisabledCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formDisabledCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition?.['formAssociated']) {
          definition?.['formDisabledCallback']?.apply(this, args);
        }
      }

      ['formResetCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formResetCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition?.['formAssociated']) {
          definition?.['formResetCallback']?.apply(this, args);
        }
      }

      ['formStateRestoreCallback'](
        this: HTMLElement,
        ...args: ParametersOf<CustomHTMLElement['formStateRestoreCallback']>
      ) {
        const definition = definitionForElement.get(this);
        if (definition?.['formAssociated']) {
          definition?.['formStateRestoreCallback']?.apply(this, args);
        }
      }

      // no attributeChangedCallback or observedAttributes since these
      // are simulated via setAttribute/removeAttribute patches
    } as unknown) as CustomElementConstructor;
  };
  window.CustomElementRegistry = ShimmedCustomElementsRegistry;

  // Helper to patch CE class setAttribute/getAttribute/toggleAttribute to
  // implement attributeChangedCallback
  const patchAttributes = (
    elementClass: CustomElementConstructor,
    observedAttributes: Set<string>,
    attributeChangedCallback?: CustomHTMLElement['attributeChangedCallback']
  ) => {
    if (
      observedAttributes.size === 0 ||
      attributeChangedCallback === undefined
    ) {
      return;
    }
    const setAttribute = elementClass.prototype.setAttribute;
    if (setAttribute) {
      elementClass.prototype.setAttribute = function (
        n: string,
        value: string
      ) {
        const name = n.toLowerCase();
        if (observedAttributes.has(name)) {
          const old = this.getAttribute(name);
          setAttribute.call(this, name, value);
          attributeChangedCallback.call(this, name, old, value);
        } else {
          setAttribute.call(this, name, value);
        }
      };
    }
    const removeAttribute = elementClass.prototype.removeAttribute;
    if (removeAttribute) {
      elementClass.prototype.removeAttribute = function (n: string) {
        const name = n.toLowerCase();
        if (observedAttributes.has(name)) {
          const old = this.getAttribute(name);
          removeAttribute.call(this, name);
          attributeChangedCallback.call(this, name, old, null);
        } else {
          removeAttribute.call(this, name);
        }
      };
    }
    const toggleAttribute = elementClass.prototype.toggleAttribute;
    if (toggleAttribute) {
      elementClass.prototype.toggleAttribute = function (
        n: string,
        force?: boolean
      ) {
        const name = n.toLowerCase();
        if (observedAttributes.has(name)) {
          const old = this.getAttribute(name);
          toggleAttribute.call(this, name, force);
          const newValue = this.getAttribute(name);
          attributeChangedCallback.call(this, name, old, newValue);
        } else {
          toggleAttribute.call(this, name, force);
        }
      };
    }
  };

  // Helper to patch CE class hierarchy changing those CE classes created before applying the polyfill
  // to make them work with the new patched CustomElementsRegistry
  const patchHTMLElement = (
    elementClass: CustomElementConstructor
  ): unknown => {
    const parentClass = Object.getPrototypeOf(elementClass);

    if (parentClass !== window.HTMLElement) {
      if (parentClass === NativeHTMLElement) {
        return Object.setPrototypeOf(elementClass, window.HTMLElement);
      }

      return patchHTMLElement(parentClass);
    }
    return;
  };

  // Helper to upgrade an instance with a CE definition using "constructor call trick"
  const customize = (
    instance: HTMLElement,
    definition: CustomElementDefinition,
    isUpgrade = false
  ) => {
    Object.setPrototypeOf(instance, definition.elementClass.prototype);
    definitionForElement.set(instance, definition);
    upgradingInstance = instance;
    try {
      new definition.elementClass();
    } catch (_) {
      patchHTMLElement(definition.elementClass);
      new definition.elementClass();
    }
    if (definition.attributeChangedCallback) {
      // Approximate observedAttributes from the user class, since the stand-in element had none
      definition.observedAttributes.forEach((attr) => {
        if (instance.hasAttribute(attr)) {
          definition.attributeChangedCallback!.call(
            instance,
            attr,
            null,
            instance.getAttribute(attr)
          );
        }
      });
    }
    if (isUpgrade && definition.connectedCallback && instance.isConnected) {
      definition.connectedCallback.call(instance);
    }
  };

  // Patch attachShadow to set customElements on shadowRoot when provided
  const nativeAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (
    ...args: Parameters<Element['attachShadow']>
  ) {
    const init = args[0];
    const shadowRoot = nativeAttachShadow.apply(this, args);
    if (init.customElements) {
      (shadowRoot as ShadowRootWithSettableCustomElements).customElements =
        init.customElements;
    }
    return shadowRoot;
  };

  // Install scoped creation API on Element & ShadowRoot
  const creationContext: Array<
    Document | CustomElementRegistry | Element | ShadowRoot
  > = [document];
  const installScopedCreationMethod = (
    ctor: Function,
    method: string,
    from?: Document
  ) => {
    const native = (from ? Object.getPrototypeOf(from) : ctor.prototype)[
      method
    ];
    ctor.prototype[method] = function (
      this: Element | ShadowRoot,
      ...args: Array<unknown>
    ) {
      creationContext.push(this);
      const ret = native.apply(from || this, args);
      // For disconnected elements, note their creation scope so that e.g.
      // innerHTML into them will use the correct scope; note that
      // insertAdjacentHTML doesn't return an element, but that's fine since
      // it will have a parent that should have a scope
      if (ret !== undefined) {
        scopeForElement.set(ret, this);
      }
      creationContext.pop();
      return ret;
    };
  };
  installScopedCreationMethod(ShadowRoot, 'createElement', document);
  installScopedCreationMethod(ShadowRoot, 'importNode', document);
  installScopedCreationMethod(Element, 'insertAdjacentHTML');

  // Install scoped innerHTML on Element & ShadowRoot
  const installScopedCreationSetter = (ctor: Function, name: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, name)!;
    Object.defineProperty(ctor.prototype, name, {
      ...descriptor,
      set(value) {
        creationContext.push(this);
        descriptor.set!.call(this, value);
        creationContext.pop();
      },
    });
  };
  installScopedCreationSetter(Element, 'innerHTML');
  installScopedCreationSetter(ShadowRoot, 'innerHTML');

  // Install global registry
  Object.defineProperty(window, 'customElements', {
    value: new CustomElementRegistry(),
    configurable: true,
    writable: true,
  });

  if (
    !!window['ElementInternals'] &&
    !!window['ElementInternals'].prototype['setFormValue']
  ) {
    const internalsToHostMap = new WeakMap<ElementInternals, HTMLElement>();
    const attachInternals = HTMLElement.prototype['attachInternals'];
    const methods: Array<keyof ElementInternals> = [
      'setFormValue',
      'setValidity',
      'checkValidity',
      'reportValidity',
    ];

    HTMLElement.prototype['attachInternals'] = function (...args) {
      const internals = attachInternals.call(this, ...args);
      internalsToHostMap.set(internals, this);
      return internals;
    };

    methods.forEach((method) => {
      const proto = window['ElementInternals'].prototype;
      const originalMethod = proto[method] as Function;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (proto as any)[method] = function (...args: Array<unknown>) {
        const host = internalsToHostMap.get(this);
        const definition = definitionForElement.get(host!);
        if (
          (definition as {formAssociated?: boolean})['formAssociated'] === true
        ) {
          return originalMethod?.call(this, ...args);
        } else {
          throw new DOMException(
            `Failed to execute ${originalMethod} on 'ElementInternals': The target element is not a form-associated custom element.`
          );
        }
      };
    });

    // Emulate the native RadioNodeList object
    const RadioNodeList = (class
      extends Array<Node>
      implements Omit<RadioNodeList, 'forEach'> {
      private _elements: Array<HTMLInputElement>;

      constructor(elements: Array<HTMLInputElement>) {
        super(...elements);
        this._elements = elements;
      }
      [index: number]: Node;

      item(index: number): Node | null {
        return this[index];
      }

      get ['value']() {
        return (
          this._elements.find((element) => element['checked'] === true)
            ?.value || ''
        );
      }
    } as unknown) as {new (elements: Array<HTMLInputElement>): RadioNodeList};

    // Emulate the native HTMLFormControlsCollection object
    const HTMLFormControlsCollection = class
      implements HTMLFormControlsCollection {
      length: number;

      constructor(elements: Array<HTMLElement>) {
        const entries = new Map<string | null, HTMLElement[]>();
        elements.forEach((element, index) => {
          const name = element.getAttribute('name');
          const nameReference = entries.get(name) || [];
          this[+index] = element;
          nameReference.push(element);
          entries.set(name, nameReference);
        });
        this['length'] = elements.length;
        entries.forEach((value, name) => {
          if (!value) return;
          if (name === 'length' || name === 'item' || name === 'namedItem')
            return;
          if (value.length === 1) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any)[name!] = value[0];
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any)[name!] = new RadioNodeList(
              value as HTMLInputElement[]
            );
          }
        });
      }

      [index: number]: Element;

      ['item'](index: number): Element | null {
        return this[index] ?? null;
      }

      [Symbol.iterator](): IterableIterator<Element> {
        throw new Error('Method not implemented.');
      }

      ['namedItem'](key: string): RadioNodeList | Element | null {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any)[key] ?? null;
      }
    };

    // Override the built-in HTMLFormElements.prototype.elements getter
    const formElementsDescriptor = Object.getOwnPropertyDescriptor(
      HTMLFormElement.prototype,
      'elements'
    )!;

    Object.defineProperty(HTMLFormElement.prototype, 'elements', {
      get: function () {
        const nativeElements = formElementsDescriptor.get!.call(this);

        const include: Array<HTMLElement> = [];

        for (const element of nativeElements) {
          const definition = definitionForElement.get(element);

          // Only purposefully formAssociated elements or built-ins will feature in elements
          if (!definition || definition['formAssociated'] === true) {
            include.push(element);
          }
        }

        return new HTMLFormControlsCollection(include);
      },
    });
  }
}
