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

/**
 * Note: this file is a script, not a module, so toplevel
 * interfaces are global. This is relevent because those named
 * after existing global TypeScript types actually add to those
 * types, as though they were declared in a `declare global` in a module.
 */

declare interface PolyfillWindow {
  CustomElementRegistryPolyfill: {
    formAssociated: Set<string>;
  };
}

const polyfillWindow = (window as unknown) as PolyfillWindow;

/**
 * Polyfill helper object. This is global and distinct from
 * `CustomElementRegistry`because the polyfill does not use modules and
 * so that it is clearly polyfill-specific and not related to the native
 * feature.
 *
 * The `formAssociated` setting cannot be properly scoped and can only be set
 * once per name. This is determined by how it is set on the first defined
 * tag name. However, adding the name to
 * `CustomElementsRegistryPolyfill.add(tagName)` reserves the given tag
 * so it's always formAssociated.
 */
if (
  polyfillWindow['CustomElementRegistryPolyfill']?.['formAssociated'] ===
  undefined
) {
  polyfillWindow['CustomElementRegistryPolyfill'] = {
    ['formAssociated']: new Set(),
  };
}

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
  initialize: (node: Node) => Node;
}

interface CustomElementDefinition {
  elementClass: CustomElementConstructor;
  tagName: string;
  /**
   * We hold onto the versions of callbacks at registration time, because
   * that's the specc'd behavior.
   */
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
  /**
   * The class that's registered on the global custom element registry for this
   * element definition. Only present if this definition is registered on the
   * global registry, though all definitions do have a standin.
   */
  standInClass?: CustomElementConstructor;
}

// Note, `registry` matches proposal but `customElements` was previously
// proposed. It's supported for back compat.
interface ShadowRootWithSettableCustomElements extends ShadowRoot {
  registry?: CustomElementRegistry | null;
  customElements: CustomElementRegistry | null;
}

interface ShadowRootInitWithSettableCustomElements extends ShadowRootInit {
  registry?: CustomElementRegistry | null;
  customElements?: CustomElementRegistry | null;
}

type ParametersOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends ((...args: any) => any) | undefined
> = T extends Function ? Parameters<T> : never;

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

const registryForElement = new WeakMap<
  Node,
  ShimmedCustomElementsRegistry | null
>();
const registryToSubtree = (
  node: Node,
  registry: ShimmedCustomElementsRegistry | null,
  shouldUpgrade?: boolean
) => {
  if (registryForElement.get(node) == null) {
    registryForElement.set(node, registry);
  }
  if (shouldUpgrade && registryForElement.get(node) === registry) {
    registry?._upgradeElement(node as HTMLElement);
  }
  const {children} = node as Element;
  if (children?.length) {
    Array.from(children).forEach((child) =>
      registryToSubtree(child, registry, shouldUpgrade)
    );
  }
};

class AsyncInfo<T> {
  readonly promise: Promise<T>;
  readonly resolve: (val: T) => void;
  constructor() {
    let resolve: (val: T) => void;
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
  private readonly _definitionsByTag = new Map<
    string,
    CustomElementDefinition
  >();
  private readonly _definitionsByClass = new Map<
    CustomElementConstructor,
    CustomElementDefinition
  >();
  private readonly _whenDefinedPromises = new Map<
    string,
    AsyncInfo<CustomElementConstructor>
  >();
  private readonly _awaitingUpgrade = new Map<string, Set<HTMLElement>>();

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
    patchAttributes(elementClass, observedAttributes, attributeChangedCallback);
    // Register a stand-in class which will handle the registry lookup & delegation
    let standInClass = nativeGet.call(nativeRegistry, tagName);
    // `formAssociated` cannot be scoped so it's set to true if
    // the first defined element sets it or it's reserved in
    // `CustomElementRegistryPolyfill.formAssociated`.
    const formAssociated =
      standInClass?.formAssociated ??
      (elementClass['formAssociated'] ||
        polyfillWindow['CustomElementRegistryPolyfill']['formAssociated'].has(
          tagName
        ));
    if (formAssociated) {
      polyfillWindow['CustomElementRegistryPolyfill']['formAssociated'].add(
        tagName
      );
    }
    // Sync the class value to the definition value for easier debuggability
    if (formAssociated != elementClass['formAssociated']) {
      try {
        elementClass['formAssociated'] = formAssociated;
      } catch (e) {
        // squelch
      }
    }
    // Register the definition
    const definition: CustomElementDefinition = {
      tagName,
      elementClass,
      connectedCallback: elementClass.prototype.connectedCallback,
      disconnectedCallback: elementClass.prototype.disconnectedCallback,
      adoptedCallback: elementClass.prototype.adoptedCallback,
      attributeChangedCallback,
      'formAssociated': formAssociated,
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
        this._upgradeElement(element, definition);
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
    args.forEach((n) => registryToSubtree(n, this));
  }

  get(tagName: string) {
    const definition = this._definitionsByTag.get(tagName);
    return definition?.elementClass;
  }

  getName(elementClass: CustomElementConstructor) {
    const definition = this._definitionsByClass.get(elementClass);
    return definition?.tagName ?? null;
  }

  _getDefinition(tagName: string) {
    return this._definitionsByTag.get(tagName);
  }

  ['whenDefined'](tagName: string) {
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

  // upgrades the given element if defined or queues it for upgrade when defined.
  _upgradeElement(element: HTMLElement, definition?: CustomElementDefinition) {
    definition ??= this._getDefinition(element.localName);
    if (definition !== undefined) {
      pendingRegistryForElement.delete(element);
      customize(element, definition!, true);
    } else {
      this._upgradeWhenDefined(element, element.localName, true);
    }
  }

  ['initialize'](node: Node) {
    registryToSubtree(node, this, true);
    return node;
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
  instance = Reflect.construct(NativeHTMLElement, [], definition.standInClass);
  Object.setPrototypeOf(instance, this.constructor.prototype);
  definitionForElement.set(instance!, definition);
  return instance;
} as unknown) as typeof HTMLElement;
window.HTMLElement.prototype = NativeHTMLElement.prototype;

// Helpers to return the scope for a node where its registry would be located
const registryFromContext = (
  node: Element
): ShimmedCustomElementsRegistry | null => {
  const explicitRegistry = registryForElement.get(node);
  if (explicitRegistry != null) {
    return explicitRegistry;
  }
  const context = creationContext[creationContext.length - 1];
  if (context instanceof CustomElementRegistry) {
    return context as ShimmedCustomElementsRegistry;
  }
  const registry = (context as Element)
    .customElements as ShimmedCustomElementsRegistry;
  return registry ?? null;
};

// Helper to create stand-in element for each tagName registered that delegates
// out to the registry for the given element
const createStandInElement = (tagName: string): CustomElementConstructor => {
  return (class ScopedCustomElementBase {
    // Note, this cannot be scoped so it's set based on a polyfill config
    // option. When this config option isn't specified, it is set
    // if the first defining element is formAssociated.
    static get ['formAssociated']() {
      return polyfillWindow['CustomElementRegistryPolyfill'][
        'formAssociated'
      ].has(tagName);
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
      const registry = registryFromContext(instance);
      registryToSubtree(instance, registry);
      const definition = registry?._getDefinition(tagName);
      if (definition) {
        customize(instance, definition);
      } else if (registry) {
        pendingRegistryForElement.set(instance, registry);
      }
      return instance;
    }

    connectedCallback(
      this: HTMLElement,
      ...args: ParametersOf<CustomHTMLElement['connectedCallback']>
    ) {
      ensureAttributesCustomized(this);
      const definition = definitionForElement.get(this);
      if (definition) {
        // Delegate out to user callback
        definition.connectedCallback &&
          definition.connectedCallback.apply(this, args);
      } else {
        // NOTE, if this has a null registry, then it should be changed
        // to the registry into which it's inserted.
        // LIMITATION: this is only done for custom elements and not built-ins
        // since we can't easily see their connection state changing.
        // Register for upgrade when defined (only when connected, so we don't leak)
        const pendingRegistry = pendingRegistryForElement.get(this);
        if (pendingRegistry !== undefined) {
          pendingRegistry._upgradeWhenDefined(this, tagName, true);
        } else {
          const registry =
            this.customElements ??
            (this.parentNode as Element | ShadowRoot)?.customElements;
          if (registry) {
            registryToSubtree(
              this,
              registry as ShimmedCustomElementsRegistry,
              true
            );
          }
        }
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
          .get(this)
          ?._upgradeWhenDefined(this, tagName, false);
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
  if (observedAttributes.size === 0 || attributeChangedCallback === undefined) {
    return;
  }
  const setAttribute = elementClass.prototype.setAttribute;
  if (setAttribute) {
    elementClass.prototype.setAttribute = function (n: string, value: string) {
      ensureAttributesCustomized(this);
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
      ensureAttributesCustomized(this);
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
      ensureAttributesCustomized(this);
      const name = n.toLowerCase();
      if (observedAttributes.has(name)) {
        const old = this.getAttribute(name);
        toggleAttribute.call(this, name, force);
        const newValue = this.getAttribute(name);
        if (old !== newValue) {
          attributeChangedCallback.call(this, name, old, newValue);
        }
      } else {
        toggleAttribute.call(this, name, force);
      }
    };
  }
};

// Helper to defer initial attribute processing for parser generated
// custom elements. These elements are created without attributes
// so attributes cannot be processed in the constructor. Instead,
// these elements are customized at the first opportunity:
// 1. when the element is connected
// 2. when any attribute API is first used
// 3. when the document becomes readyState === interactive (the parser is done)
let elementsPendingAttributes: Set<CustomHTMLElement & HTMLElement> | undefined;
if (document.readyState === 'loading') {
  elementsPendingAttributes = new Set();
  document.addEventListener(
    'readystatechange',
    () => {
      elementsPendingAttributes!.forEach((instance) =>
        customizeAttributes(instance, definitionForElement.get(instance)!)
      );
    },
    {once: true}
  );
}

const ensureAttributesCustomized = (
  instance: CustomHTMLElement & HTMLElement
) => {
  if (!elementsPendingAttributes?.has(instance)) {
    return;
  }
  customizeAttributes(instance, definitionForElement.get(instance)!);
};

// Approximate observedAttributes from the user class, since the stand-in element had none
const customizeAttributes = (
  instance: CustomHTMLElement & HTMLElement,
  definition: CustomElementDefinition
) => {
  elementsPendingAttributes?.delete(instance);
  if (!definition.attributeChangedCallback) {
    return;
  }
  definition.observedAttributes.forEach((attr: string) => {
    if (!instance.hasAttribute(attr)) {
      return;
    }
    definition.attributeChangedCallback!.call(
      instance,
      attr,
      null,
      instance.getAttribute(attr)
    );
  });
};

// Helper to patch CE class hierarchy changing those CE classes created before applying the polyfill
// to make them work with the new patched CustomElementsRegistry
const patchHTMLElement = (elementClass: CustomElementConstructor): unknown => {
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
    // Note, these checks determine if the element is being parser created.
    // and has no attributes when created. In this case, it may have attributes
    // in HTML that are immediately processed. To handle this, the instance
    // is added to a set and its attributes are customized at first
    // opportunity (e.g. when connected or when the parser completes and the
    // document becomes interactive).
    if (elementsPendingAttributes !== undefined && !instance.hasAttributes()) {
      elementsPendingAttributes.add(instance);
    } else {
      customizeAttributes(instance, definition);
    }
  }
  if (isUpgrade && definition.connectedCallback && instance.isConnected) {
    definition.connectedCallback.call(instance);
  }
};

// Patch attachShadow to set customElements on shadowRoot when provided
const nativeAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (
  init: ShadowRootInitWithSettableCustomElements,
  ...args: unknown[]
) {
  // note, set registry to undefined to avoid using a native implementation
  const nativeArgs = ([
    {
      ...init,
      registry: undefined,
    },
    ...args,
  ] as unknown) as [init: ShadowRootInit];
  const shadowRoot = nativeAttachShadow.apply(this, nativeArgs);
  // Note, this allows a `null` customElements purely for testing.
  const registry =
    init['customElements'] === undefined
      ? init['registry']
      : init['customElements'];
  if (registry !== undefined) {
    registryForElement.set(
      shadowRoot,
      registry as ShimmedCustomElementsRegistry
    );
    (shadowRoot as ShadowRootWithSettableCustomElements)['registry'] = registry;
  }
  return shadowRoot;
};

const customElementsDescriptor = {
  get(this: Element) {
    const registry = registryForElement.get(this);
    return registry === undefined
      ? ((this.nodeType === Node.DOCUMENT_NODE
          ? this
          : this.ownerDocument) as Document)?.defaultView?.customElements ||
          null
      : registry;
  },
  enumerable: true,
  configurable: true,
};

const {createElement, createElementNS, importNode} = Document.prototype;

Object.defineProperty(
  Element.prototype,
  'customElements',
  customElementsDescriptor
);
Object.defineProperties(Document.prototype, {
  'customElements': customElementsDescriptor,
  'createElement': {
    value<K extends keyof HTMLElementTagNameMap>(
      this: Document,
      tagName: K,
      options?: ElementCreationOptions
    ): HTMLElementTagNameMap[K] {
      const {customElements} = options ?? {};
      if (customElements === undefined) {
        return createElement.call(this, tagName) as HTMLElementTagNameMap[K];
      } else {
        creationContext.push(customElements);
        const el = createElement.call(
          this,
          tagName
        ) as HTMLElementTagNameMap[K];
        creationContext.pop();
        registryToSubtree(el, customElements as ShimmedCustomElementsRegistry);
        return el;
      }
    },
    enumerable: true,
    configurable: true,
  },
  'createElementNS': {
    value<K extends keyof HTMLElementTagNameMap>(
      this: Document,
      namespace: string | null,
      tagName: K,
      options?: ElementCreationOptions
    ): HTMLElementTagNameMap[K] {
      const {customElements} = options ?? {};
      if (customElements === undefined) {
        return createElementNS.call(
          this,
          namespace,
          tagName
        ) as HTMLElementTagNameMap[K];
      } else {
        creationContext.push(customElements);
        const el = createElementNS.call(
          this,
          namespace,
          tagName
        ) as HTMLElementTagNameMap[K];
        creationContext.pop();
        registryToSubtree(el, customElements as ShimmedCustomElementsRegistry);
        return el;
      }
    },
    enumerable: true,
    configurable: true,
  },
  'importNode': {
    value<T extends Node>(
      this: Document,
      node: T,
      options?: boolean | ImportNodeOptions
    ): T {
      const deep = typeof options === 'boolean' ? options : !options?.selfOnly;
      const {customElements} = (options ?? {}) as ImportNodeOptions;
      if (customElements === undefined) {
        return importNode.call(this, node, deep) as T;
      }
      creationContext.push(customElements);
      const imported = importNode.call(this, node, deep) as T;
      creationContext.pop();
      registryToSubtree(
        imported,
        customElements as ShimmedCustomElementsRegistry
      );
      return imported;
    },
    enumerable: true,
    configurable: true,
  },
});
Object.defineProperty(
  ShadowRoot.prototype,
  'customElements',
  customElementsDescriptor
);

// Install scoped creation API on Element & ShadowRoot
const creationContext: Array<
  Document | CustomElementRegistry | Element | ShadowRoot
> = [document];
const installScopedMethod = (
  ctor: Function,
  method: string,
  coda = function (this: Element, result: Node) {
    registryToSubtree(
      result ?? this,
      this.customElements as ShimmedCustomElementsRegistry
    );
  }
) => {
  const native = ctor.prototype[method];
  if (native === undefined) {
    return;
  }
  ctor.prototype[method] = function (
    this: Element | ShadowRoot,
    ...args: Array<unknown>
  ) {
    creationContext.push(this);
    const ret = native.apply(this, args);
    creationContext.pop();
    coda?.call(this as Element, ret);
    return ret;
  };
};

const applyScopeFromParent = function (this: Element) {
  const scope = (this.parentNode ?? this) as Element;
  registryToSubtree(
    scope,
    scope.customElements as ShimmedCustomElementsRegistry
  );
};

installScopedMethod(Element, 'insertAdjacentHTML', applyScopeFromParent);
installScopedMethod(Element, 'setHTMLUnsafe');
installScopedMethod(ShadowRoot, 'setHTMLUnsafe');

// For setting null elements to this scope.
installScopedMethod(Node, 'appendChild');
installScopedMethod(Node, 'insertBefore');
installScopedMethod(Element, 'append');
installScopedMethod(Element, 'prepend');
installScopedMethod(Element, 'insertAdjacentElement', applyScopeFromParent);
installScopedMethod(Element, 'replaceChild');
installScopedMethod(Element, 'replaceChildren');
installScopedMethod(DocumentFragment, 'append');
installScopedMethod(Element, 'replaceWith', applyScopeFromParent);

// Install scoped innerHTML on Element & ShadowRoot
const installScopedSetter = (ctor: Function, name: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(ctor.prototype, name)!;
  Object.defineProperty(ctor.prototype, name, {
    ...descriptor,
    set(value) {
      creationContext.push(this);
      descriptor.set!.call(this, value);
      creationContext.pop();
      registryToSubtree(this, this.customElements);
    },
  });
};
installScopedSetter(Element, 'innerHTML');
installScopedSetter(ShadowRoot, 'innerHTML');

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

  const proto = window['ElementInternals'].prototype;

  methods.forEach((method) => {
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
        this._elements.find((element) => element['checked'] === true)?.value ||
        ''
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
          (this as any)[name!] = new RadioNodeList(value as HTMLInputElement[]);
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
