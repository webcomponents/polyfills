interface ShadyCSSInterface {
  styleElement(element: HTMLElement): void;
  styleSubtree(
    element: HTMLElement,
    properties?: {[name: string]: string}
  ): void;
  prepareTemplate(
    template: HTMLTemplateElement,
    elementName: string,
    elementExtends?: string
  ): void;
  prepareTemplateStyles(
    template: HTMLTemplateElement,
    elementName: string,
    elementExtends?: string
  ): void;
  prepareTemplateDom(template: HTMLTemplateElement, elementName: string): void;
  styleDocument(properties?: {[name: string]: string}): void;
  flushCustomStyles(): void;
  getComputedStyleValue(element: Element, property: string): string;
  ScopingShim?: {
    prepareAdoptedCssText(
      cssTextArray: Array<string>,
      elementName: string
    ): void;
    flush(): void;
  };
  ApplyShim?: Object;
  CustomStyleInterface?: Object;
  nativeCss: boolean;
  nativeShadow: boolean;
  cssBuild?: string;
  disableRuntime: boolean;
}

interface ShadyCSSOptions {
  shimcssproperties?: boolean;
  shimshadow?: boolean;
  cssBuild?: boolean;
  disableRuntime?: boolean;
}

// This type alias exists because Tsickle will replace any type name used in the
// type of something with the same name with `?`. (Maybe a Closure limitation?)
// Making `ShadyCSS` an alias to an underlying type with a different name works
// around this because Tsickle appears to resolve type aliases in its output: it
// writes `undefined|ShadyCSSInterface` instead of `undefined|?` as the type for
// the `ShadyCSS` global.
type ShadyCSS = ShadyCSSInterface;
// eslint-disable-next-line no-var
declare var ShadyCSS: ShadyCSS | undefined;

interface Element {
  extends?: string;
  _element?: Element | null;
  __cssBuild?: string;
}

interface HTMLTemplateElement {
  _validating?: boolean;
  _prepared?: boolean;
  _domPrepared?: boolean;
  _content?: DocumentFragment | null;
  _gatheredStyle?: HTMLStyleElement | null;
  _style?: HTMLStyleElement | null;
}
