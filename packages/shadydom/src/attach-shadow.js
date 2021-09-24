/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {calculateSplices} from './array-splice.js';
import * as utils from './utils.js';
import {enqueue} from './flush.js';
import {ensureShadyDataForNode, shadyDataForNode} from './shady-data.js';
import {recordChildNodes} from './link-nodes.js';
import {patchShadyRoot} from './patch-shadyRoot.js';

// Do not export this object. It must be passed as the first argument to the
// ShadyRoot constructor in `attachShadow` to prevent the constructor from
// throwing. This prevents the user from being able to manually construct a
// ShadyRoot (i.e. `new ShadowRoot()`).
const ShadyRootConstructionToken = {};

const CATCHALL_NAME = '__catchall';

const MODE_CLOSED = 'closed';

let isRendering =
  utils.settings['deferConnectionCallbacks'] &&
  document.readyState === 'loading';
let rootRendered;

function ancestorList(node) {
  let ancestors = [];
  do {
    ancestors.unshift(node);
  } while ((node = node[utils.SHADY_PREFIX + 'parentNode']));
  return ancestors;
}

/**
 * @extends {ShadowRoot}
 */
class ShadyRoot {
  constructor(token, host, options) {
    if (token !== ShadyRootConstructionToken) {
      throw new TypeError('Illegal constructor');
    }
    /** @type {boolean} */
    this._renderPending;
    /** @type {boolean} */
    this._hasRendered;
    /** @type {?Array<HTMLSlotElement>} */
    this._slotList = null;
    /** @type {?Object<string, Array<HTMLSlotElement>>} */
    this._slotMap;
    /** @type {?Array<HTMLSlotElement>} */
    this._pendingSlots;
    this._init(host, options);
  }

  _init(host, options) {
    // root <=> host
    this.host = host;
    /** @type {!string|undefined} */
    this.mode = options && options.mode;
    recordChildNodes(this.host);
    const hostData = ensureShadyDataForNode(this.host);
    /** @type {!ShadyRoot} */
    hostData.root = this;
    hostData.publicRoot = this.mode !== MODE_CLOSED ? this : null;
    // setup root
    const rootData = ensureShadyDataForNode(this);
    rootData.firstChild = rootData.lastChild = rootData.parentNode = rootData.nextSibling = rootData.previousSibling = null;
    // NOTE: optimization flag, only require an asynchronous render
    // to record parsed children if flag is not set.
    if (utils.settings['preferPerformance']) {
      let n;
      while ((n = this.host[utils.NATIVE_PREFIX + 'firstChild'])) {
        this.host[utils.NATIVE_PREFIX + 'removeChild'](n);
      }
    } else {
      this._asyncRender();
    }
  }

  _asyncRender() {
    if (!this._renderPending) {
      this._renderPending = true;
      enqueue(() => this._render());
    }
  }

  // returns the oldest renderPending ancestor root.
  _getPendingDistributionRoot() {
    let renderRoot;
    let root = this;
    while (root) {
      if (root._renderPending) {
        renderRoot = root;
      }
      root = root._getDistributionParent();
    }
    return renderRoot;
  }

  // Returns the shadyRoot `this.host` if `this.host`
  // has children that require distribution.
  _getDistributionParent() {
    let root = this.host[utils.SHADY_PREFIX + 'getRootNode']();
    if (!utils.isShadyRoot(root)) {
      return;
    }
    const nodeData = shadyDataForNode(this.host);
    if (nodeData && nodeData.__childSlotCount > 0) {
      return root;
    }
  }

  // Renders the top most render pending shadowRoot in the distribution tree.
  // This is safe because when a distribution parent renders, all children render.
  _render() {
    // If this root is not pending, it needs no rendering work. Any pending
    // parent that needs to render wll cause this root to render.
    const root = this._renderPending && this._getPendingDistributionRoot();
    if (root) {
      root._renderSelf();
    }
  }

  _flushInitial() {
    if (!this._hasRendered && this._renderPending) {
      this._render();
    }
  }

  /** @override */
  _renderSelf() {
    // track rendering state.
    const wasRendering = isRendering;
    isRendering = true;
    this._renderPending = false;
    if (this._slotList) {
      this._distribute();
      this._compose();
    }
    // NOTE: optimization flag, only process parsed children
    // if optimization flag is not set.
    // on initial render remove any undistributed children.
    if (!utils.settings['preferPerformance'] && !this._hasRendered) {
      for (
        let n = this.host[utils.SHADY_PREFIX + 'firstChild'];
        n;
        n = n[utils.SHADY_PREFIX + 'nextSibling']
      ) {
        const data = shadyDataForNode(n);
        if (
          n[utils.NATIVE_PREFIX + 'parentNode'] === this.host &&
          (n.localName === 'slot' || !data.assignedSlot)
        ) {
          this.host[utils.NATIVE_PREFIX + 'removeChild'](n);
        }
      }
    }
    this._hasRendered = true;
    isRendering = wasRendering;
    if (rootRendered) {
      rootRendered();
    }
  }

  _distribute() {
    this._validateSlots();
    // capture # of previously assigned nodes to help determine if dirty.
    for (let i = 0, slot; i < this._slotList.length; i++) {
      slot = this._slotList[i];
      this._clearSlotAssignedNodes(slot);
    }
    // distribute host children.
    for (
      let n = this.host[utils.SHADY_PREFIX + 'firstChild'];
      n;
      n = n[utils.SHADY_PREFIX + 'nextSibling']
    ) {
      this._distributeNodeToSlot(n);
    }
    // fallback content, slotchange, and dirty roots
    for (let i = 0; i < this._slotList.length; i++) {
      const slot = this._slotList[i];
      const slotData = shadyDataForNode(slot);
      // distribute fallback content
      if (!slotData.assignedNodes.length) {
        for (
          let n = slot[utils.SHADY_PREFIX + 'firstChild'];
          n;
          n = n[utils.SHADY_PREFIX + 'nextSibling']
        ) {
          this._distributeNodeToSlot(n, slot);
        }
      }
      const slotParentData = shadyDataForNode(
        slot[utils.SHADY_PREFIX + 'parentNode']
      );
      const slotParentRoot = slotParentData && slotParentData.root;
      if (
        slotParentRoot &&
        (slotParentRoot._hasInsertionPoint() || slotParentRoot._renderPending)
      ) {
        slotParentRoot._renderSelf();
      }
      this._addAssignedToFlattenedNodes(
        slotData.flattenedNodes,
        slotData.assignedNodes
      );
      let prevAssignedNodes = slotData._previouslyAssignedNodes;
      if (prevAssignedNodes) {
        for (let i = 0; i < prevAssignedNodes.length; i++) {
          shadyDataForNode(prevAssignedNodes[i])._prevAssignedSlot = null;
        }
        slotData._previouslyAssignedNodes = null;
        // dirty if previously less assigned nodes than previously assigned.
        if (prevAssignedNodes.length > slotData.assignedNodes.length) {
          slotData.dirty = true;
        }
      }
      /* Note: A slot is marked dirty whenever a node is newly assigned to it
      or a node is assigned to a different slot (done in `_distributeNodeToSlot`)
      or if the number of nodes assigned to the slot has decreased (done above);
      */
      if (slotData.dirty) {
        slotData.dirty = false;
        this._fireSlotChange(slot);
      }
    }
  }

  /**
   * Distributes given `node` to the appropriate slot based on its `slot`
   * attribute. If `forcedSlot` is given, then the node is distributed to the
   * `forcedSlot`.
   * Note: slot to which the node is assigned will be marked dirty for firing
   * `slotchange`.
   * @param {Node} node
   * @param {Node=} forcedSlot
   *
   */
  _distributeNodeToSlot(node, forcedSlot) {
    const nodeData = ensureShadyDataForNode(node);
    let oldSlot = nodeData._prevAssignedSlot;
    nodeData._prevAssignedSlot = null;
    let slot = forcedSlot;
    if (!slot) {
      let name = node[utils.SHADY_PREFIX + 'slot'] || CATCHALL_NAME;
      const list = this._slotMap[name];
      slot = list && list[0];
    }
    if (slot) {
      const slotData = ensureShadyDataForNode(slot);
      slotData.assignedNodes.push(node);
      nodeData.assignedSlot = slot;
    } else {
      nodeData.assignedSlot = undefined;
    }
    if (oldSlot !== nodeData.assignedSlot) {
      if (nodeData.assignedSlot) {
        ensureShadyDataForNode(nodeData.assignedSlot).dirty = true;
      }
    }
  }

  /**
   * Clears the assignedNodes tracking data for a given `slot`. Note, the current
   * assigned node data is tracked (via _previouslyAssignedNodes and
   * _prevAssignedSlot) to see if `slotchange` should fire. This data may be out
   *  of date at this time because the assigned nodes may have already been
   * distributed to another root. This is ok since this data is only used to
   * track changes.
   * @param {HTMLSlotElement} slot
   */
  _clearSlotAssignedNodes(slot) {
    const slotData = shadyDataForNode(slot);
    let n$ = slotData.assignedNodes;
    slotData.assignedNodes = [];
    slotData.flattenedNodes = [];
    slotData._previouslyAssignedNodes = n$;
    if (n$) {
      for (let i = 0; i < n$.length; i++) {
        let n = shadyDataForNode(n$[i]);
        n._prevAssignedSlot = n.assignedSlot;
        // only clear if it was previously set to this slot;
        // this helps ensure that if the node has otherwise been distributed
        // ignore it.
        if (n.assignedSlot === slot) {
          n.assignedSlot = null;
        }
      }
    }
  }

  _addAssignedToFlattenedNodes(flattened, assigned) {
    for (let i = 0, n; i < assigned.length && (n = assigned[i]); i++) {
      if (n.localName == 'slot') {
        const nestedAssigned = shadyDataForNode(n).assignedNodes;
        if (nestedAssigned && nestedAssigned.length) {
          this._addAssignedToFlattenedNodes(flattened, nestedAssigned);
        }
      } else {
        flattened.push(assigned[i]);
      }
    }
  }

  _fireSlotChange(slot) {
    // NOTE: cannot bubble correctly here so not setting bubbles: true
    // Safari tech preview does not bubble but chrome does
    // Spec says it bubbles (https://dom.spec.whatwg.org/#mutation-observers)
    slot[utils.NATIVE_PREFIX + 'dispatchEvent'](new Event('slotchange'));
    const slotData = shadyDataForNode(slot);
    if (slotData.assignedSlot) {
      this._fireSlotChange(slotData.assignedSlot);
    }
  }

  // Reify dom such that it is at its correct rendering position
  // based on logical distribution.
  // NOTE: here we only compose parents of <slot> elements and not the
  // shadowRoot into the host. The latter is performend via a fast path
  // in the `logical-mutation`.insertBefore.
  _compose() {
    const slots = this._slotList;
    let composeList = [];
    for (let i = 0; i < slots.length; i++) {
      const parent = slots[i][utils.SHADY_PREFIX + 'parentNode'];
      /* compose node only if:
        (1) parent does not have a shadowRoot since shadowRoot has already
        composed into the host
        (2) we're not already composing it
        [consider (n^2) but rare better than Set]
      */
      const parentData = shadyDataForNode(parent);
      if (!(parentData && parentData.root) && composeList.indexOf(parent) < 0) {
        composeList.push(parent);
      }
    }
    for (let i = 0; i < composeList.length; i++) {
      const node = composeList[i];
      const targetNode = node === this ? this.host : node;
      this._updateChildNodes(targetNode, this._composeNode(node));
    }
  }

  // Returns the list of nodes which should be rendered inside `node`.
  _composeNode(node) {
    let children = [];
    for (
      let n = node[utils.SHADY_PREFIX + 'firstChild'];
      n;
      n = n[utils.SHADY_PREFIX + 'nextSibling']
    ) {
      // Note: if we see a slot here, the nodes are guaranteed to need to be
      // composed here. This is because if there is redistribution, it has
      // already been handled by this point.
      if (this._isInsertionPoint(n)) {
        let flattenedNodes = shadyDataForNode(n).flattenedNodes;
        for (let j = 0; j < flattenedNodes.length; j++) {
          let distributedNode = flattenedNodes[j];
          children.push(distributedNode);
        }
      } else {
        children.push(n);
      }
    }
    return children;
  }

  _isInsertionPoint(node) {
    return node.localName == 'slot';
  }

  // Ensures that the rendered node list inside `container` is `children`.
  _updateChildNodes(container, children) {
    let composed = utils.nativeChildNodesArray(container);
    let splices = calculateSplices(children, composed);
    // process removals
    for (let i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
      for (let j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
        // check if the node is still where we expect it is before trying
        // to remove it; this can happen if we move a node and
        // then schedule its previous host for distribution resulting in
        // the node being removed here.
        if (n[utils.NATIVE_PREFIX + 'parentNode'] === container) {
          container[utils.NATIVE_PREFIX + 'removeChild'](n);
        }
        // TODO(sorvell): avoid the need for splicing here.
        composed.splice(s.index + d, 1);
      }
      d -= s.addedCount;
    }
    // process adds
    for (let i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
      // eslint-disable-line no-redeclare
      next = composed[s.index];
      for (let j = s.index, n; j < s.index + s.addedCount; j++) {
        n = children[j];
        container[utils.NATIVE_PREFIX + 'insertBefore'](n, next);
        composed.splice(j, 0, n);
      }
    }
  }

  _ensureSlotData() {
    this._pendingSlots = this._pendingSlots || [];
    this._slotList = this._slotList || [];
    this._slotMap = this._slotMap || {};
  }

  _addSlots(slots) {
    this._ensureSlotData();
    this._pendingSlots.push(...slots);
  }

  _validateSlots() {
    if (this._pendingSlots && this._pendingSlots.length) {
      this._mapSlots(this._pendingSlots);
      this._pendingSlots = [];
    }
  }

  /**
   * Adds the given slots. Slots are maintained in an dom-ordered list.
   * In addition a map of name to slot is updated.
   */
  _mapSlots(slots) {
    let slotNamesToSort;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      // ensure insertionPoints's and their parents have logical dom info.
      // save logical tree info
      // a. for shadyRoot
      // b. for insertion points (fallback)
      // c. for parents of insertion points
      recordChildNodes(slot);
      const slotParent = slot[utils.SHADY_PREFIX + 'parentNode'];
      recordChildNodes(slotParent);
      const slotParentData = shadyDataForNode(slotParent);
      slotParentData.__childSlotCount =
        (slotParentData.__childSlotCount || 0) + 1;
      let name = this._nameForSlot(slot);
      if (this._slotMap[name]) {
        slotNamesToSort = slotNamesToSort || {};
        slotNamesToSort[name] = true;
        this._slotMap[name].push(slot);
      } else {
        this._slotMap[name] = [slot];
      }
      this._slotList.push(slot);
    }
    if (slotNamesToSort) {
      for (let n in slotNamesToSort) {
        this._slotMap[n] = this._sortSlots(this._slotMap[n]);
      }
    }
  }

  _nameForSlot(slot) {
    const name = slot['name'] || slot.getAttribute('name') || CATCHALL_NAME;
    slot.__slotName = name;
    return name;
  }

  /**
   * Slots are kept in an ordered list. Slots with the same name
   * are sorted here by tree order.
   */
  _sortSlots(slots) {
    // NOTE: Cannot use `compareDocumentPosition` because it's not polyfilled,
    // but the code here could be used to polyfill the preceeding/following info
    // in `compareDocumentPosition`.
    return slots.sort((a, b) => {
      let listA = ancestorList(a);
      let listB = ancestorList(b);
      for (var i = 0; i < listA.length; i++) {
        let nA = listA[i];
        let nB = listB[i];
        if (nA !== nB) {
          let c$ = utils.childNodesArray(nA[utils.SHADY_PREFIX + 'parentNode']);
          return c$.indexOf(nA) - c$.indexOf(nB);
        }
      }
    });
  }

  /**
   * Removes from tracked slot data any slots contained within `container` and
   * then updates the tracked data (_slotList and _slotMap).
   * Any removed slots also have their `assignedNodes` removed from comopsed dom.
   */
  _removeContainedSlots(container) {
    if (!this._slotList) {
      return;
    }
    this._validateSlots();
    let didRemove;
    const map = this._slotMap;
    for (let n in map) {
      const slots = map[n];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (utils.contains(container, slot)) {
          slots.splice(i, 1);
          const x = this._slotList.indexOf(slot);
          if (x >= 0) {
            this._slotList.splice(x, 1);
            const slotParentData = shadyDataForNode(
              slot[utils.SHADY_PREFIX + 'parentNode']
            );
            if (slotParentData && slotParentData.__childSlotCount) {
              slotParentData.__childSlotCount--;
            }
          }
          i--;
          this._removeFlattenedNodes(slot);
          didRemove = true;
        }
      }
    }
    return didRemove;
  }

  _updateSlotName(slot) {
    if (!this._slotList) {
      return;
    }
    // make sure slotMap is initialized with this slot
    this._validateSlots();
    const oldName = slot.__slotName;
    const name = this._nameForSlot(slot);
    if (name === oldName) {
      return;
    }
    // remove from existing tracking
    let slots = this._slotMap[oldName];
    const i = slots.indexOf(slot);
    if (i >= 0) {
      slots.splice(i, 1);
    }
    // add to new location and sort if nedessary
    let list = this._slotMap[name] || (this._slotMap[name] = []);
    list.push(slot);
    if (list.length > 1) {
      this._slotMap[name] = this._sortSlots(list);
    }
  }

  _removeFlattenedNodes(slot) {
    const data = shadyDataForNode(slot);
    let n$ = data.flattenedNodes;
    if (n$) {
      for (let i = 0; i < n$.length; i++) {
        let node = n$[i];
        let parent = node[utils.NATIVE_PREFIX + 'parentNode'];
        if (parent) {
          parent[utils.NATIVE_PREFIX + 'removeChild'](node);
        }
      }
    }
    data.flattenedNodes = [];
    data.assignedNodes = [];
  }

  _hasInsertionPoint() {
    this._validateSlots();
    return Boolean(this._slotList && this._slotList.length);
  }
}

patchShadyRoot(ShadyRoot.prototype);
export {ShadyRoot};

/**
  Implements a pared down version of ShadowDOM's scoping, which is easy to
  polyfill across browsers.
*/
export const attachShadow = (host, options) => {
  if (!host) {
    throw new Error('Must provide a host.');
  }
  if (!options) {
    throw new Error('Not enough arguments.');
  }
  let root;
  // Optimization for booting up a shadowRoot from a fragment rather than
  // creating one.
  if (options['shadyUpgradeFragment'] && utils.canUpgrade()) {
    root = options['shadyUpgradeFragment'];
    root.__proto__ = ShadowRoot.prototype;
    root._init(host, options);
    recordChildNodes(root, root);
    // Note: qsa is native when used with noPatch.
    /** @type {?NodeList<Element>} */
    const slotsAdded = root['__noInsertionPoint']
      ? null
      : root.querySelectorAll('slot');
    // Reset scoping information so normal scoing rules apply after this.
    root['__noInsertionPoint'] = undefined;
    // if a slot is added, must render containing root.
    if (slotsAdded && slotsAdded.length) {
      root._addSlots(slotsAdded);
      root._asyncRender();
    }
    /** @type {ShadowRoot} */ (root).host[utils.NATIVE_PREFIX + 'appendChild'](
      root
    );
  } else {
    root = new ShadyRoot(ShadyRootConstructionToken, host, options);
  }
  return root;
};

// Mitigate connect/disconnect spam by wrapping custom element classes. This
// should happen if custom elements are available in any capacity, polyfilled or
// not.
if (
  utils.hasCustomElements() &&
  utils.settings.inUse &&
  !utils.settings['preferPerformance']
) {
  // process connect/disconnect after roots have rendered to avoid
  // issues with reaction stack.
  let connectMap = new Map();
  rootRendered = function () {
    // allow elements to connect
    // save map state (without needing polyfills on IE11)
    const r = [];
    connectMap.forEach((v, k) => {
      r.push([k, v]);
    });
    connectMap.clear();
    for (let i = 0; i < r.length; i++) {
      const e = r[i][0],
        value = r[i][1];
      if (value) {
        e['__shadydom_connectedCallback']();
      } else {
        e['__shadydom_disconnectedCallback']();
      }
    }
  };

  // Document is in loading state and flag is set (deferConnectionCallbacks)
  // so process connection stack when `readystatechange` fires.
  if (isRendering) {
    document.addEventListener(
      'readystatechange',
      () => {
        isRendering = false;
        rootRendered();
      },
      {once: true}
    );
  }

  /*
   * (1) elements can only be connected/disconnected if they are in the expected
   * state.
   * (2) never run connect/disconnect during rendering to avoid reaction stack issues.
   */
  const ManageConnect = (base, connected, disconnected) => {
    let counter = 0;
    const connectFlag = `__isConnected${counter++}`;
    if (connected || disconnected) {
      /** @this {!HTMLElement} */
      base.prototype.connectedCallback = base.prototype[
        '__shadydom_connectedCallback'
      ] = function () {
        // if rendering defer connected
        // otherwise connect only if we haven't already
        if (isRendering) {
          connectMap.set(this, true);
        } else if (!this[connectFlag]) {
          this[connectFlag] = true;
          if (connected) {
            connected.call(this);
          }
        }
      };

      /** @this {!HTMLElement} */
      base.prototype.disconnectedCallback = base.prototype[
        '__shadydom_disconnectedCallback'
      ] = function () {
        // if rendering, cancel a pending connection and queue disconnect,
        // otherwise disconnect only if a connection has been allowed
        if (isRendering) {
          // This is necessary only because calling removeChild
          // on a node that requires distribution leaves it in the DOM tree
          // until distribution.
          // NOTE: remember this is checking the patched isConnected to determine
          // if the node is in the logical tree.
          if (!this.isConnected) {
            connectMap.set(this, false);
          }
        } else if (this[connectFlag]) {
          this[connectFlag] = false;
          if (disconnected) {
            disconnected.call(this);
          }
        }
      };
    }

    return base;
  };

  const originalDefine = window['customElements']['define'];
  const define = function (name, constructor) {
    const connected = constructor.prototype.connectedCallback;
    const disconnected = constructor.prototype.disconnectedCallback;
    originalDefine.call(
      window['customElements'],
      name,
      ManageConnect(constructor, connected, disconnected)
    );
    // unpatch connected/disconnected on class; custom elements tears this off
    // so the patch is maintained, but if the user calls these methods for
    // e.g. testing, they will be as expected.
    constructor.prototype.connectedCallback = connected;
    constructor.prototype.disconnectedCallback = disconnected;
  };
  // Note, it would be better to only patch the CustomElementRegistry.prototype,
  // but ShadyCSS patches define directly.
  window.customElements.define = define;
  // Still patch the registry directly since Safari 10 loses the patch
  // unless this is done.
  Object.defineProperty(window['CustomElementRegistry'].prototype, 'define', {
    value: define,
    configurable: true,
  });
}

/** @return {!ShadyRoot|undefined} */
export const ownerShadyRootForNode = (node) => {
  let root = node[utils.SHADY_PREFIX + 'getRootNode']();
  if (utils.isShadyRoot(root)) {
    return root;
  }
};
