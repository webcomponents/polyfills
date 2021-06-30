/**
 * @fileoverview Externs for Shady DOM
 */

interface ShadyDOMInterface {
  flush: () => void;
  inUse: boolean;
  noPatch: boolean | string;
  patchElementProto: (node: Object) => void;
  wrap: (node: Node) => Node;
}

type ShadyDOM = ShadyDOMInterface;
// eslint-disable-next-line no-var
declare var ShadyDOM: ShadyDOM;

/**
 * Block renaming of properties added to Node to
 * prevent conflicts with other closure-compiler code.
 */
interface EventTarget {
  __handlers?: Object;
}

interface Node {
  __shady?: Object;
}

interface IWrapper {
  _activeElement?: Node;
  // NOTE: For some reason, Closure likes to remove focus() from the IWrapper
  // class. Not yet clear why focus() is affected and not any other methods
  // (e.g. blur).
  focus(): void;
}

interface Event {
  __composed?: boolean;
  __immediatePropagationStopped?: boolean;
  __relatedTarget?: Node;
  __composedPath?: Array<EventTarget>;
  __relatedTargetComposedPath: Array<EventTarget>;
}

interface ShadowRoot {
  /**
   * Prevent renaming of this method on ShadyRoot for testing and debugging.
   */
  _renderSelf(): void;
}

// Prevent renaming of properties used by Polymer templates with
// shadyUpgradeFragment optimization
interface DocumentFragment {
  $: Object;
  __noInsertionPoint: boolean;
  nodeList: Array<Node>;
  templateInfo: Object;
}
