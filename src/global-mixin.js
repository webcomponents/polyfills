/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

import * as utils from './utils'
import {getInnerHTML} from './innerHTML'
import {nativeTree} from './native-tree'

function getLogical(node, prop) {
  return node.__shady && node.__shady[prop];
}

function hasLogical(node, prop) {
  return getLogical(node, prop) !== undefined;
}

export function getNative(node, prop) {
  return node.__nativeProps[prop].get.call(node);
}

export function setNative(node, prop, value) {
  node.__nativeProps[prop].set.call(node, value);
}

export function nativeMethod(node, prop, args) {
  return node.__nativeProps[prop].value.apply(node, args);
}

function recordInsertBefore(node, container, ref_node) {
  container.__shady = container.__shady || {};
  if (hasLogical(container, 'firstChild')) {
    container.__shady.childNodes = null;
  }
  // handle document fragments
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    let c$ = node.childNodes;
    for (let i=0; i < c$.length; i++) {
      linkNode(c$[i], container, ref_node);
    }
    // cleanup logical dom in doc fragment.
    node.__shady = node.__shady || {};
    let resetTo = hasLogical(node, 'firstChild') ? null : undefined;
    node.__shady.firstChild = node.__shady.lastChild = resetTo;
    node.__shady.childNodes = resetTo;
  } else {
    linkNode(node, container, ref_node);
  }
}

function linkNode(node, container, ref_node) {
  ref_node = ref_node || null;
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (ref_node) {
    ref_node.__shady = ref_node.__shady || {};
  }
  // update ref_node.previousSibling <-> node
  node.__shady.previousSibling = ref_node ? ref_node.__shady.previousSibling :
    container.lastChild;
  let ps = node.__shady.previousSibling;
  if (ps && ps.__shady) {
    ps.__shady.nextSibling = node;
  }
  // update node <-> ref_node
  let ns = node.__shady.nextSibling = ref_node;
  if (ns && ns.__shady) {
    ns.__shady.previousSibling = node;
  }
  // update node <-> container
  node.__shady.parentNode = container;
  if (ref_node) {
    if (ref_node === container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  } else {
    container.__shady.lastChild = node;
    if (!container.__shady.firstChild) {
      container.__shady.firstChild = node;
    }
  }
  // remove caching of childNodes
  container.__shady.childNodes = null;
}

function recordRemoveChild(node, container) {
  node.__shady = node.__shady || {};
  container.__shady = container.__shady || {};
  if (node === container.__shady.firstChild) {
    container.__shady.firstChild = node.__shady.nextSibling;
  }
  if (node === container.__shady.lastChild) {
    container.__shady.lastChild = node.__shady.previousSibling;
  }
  let p = node.__shady.previousSibling;
  let n = node.__shady.nextSibling;
  if (p) {
    p.__shady = p.__shady || {};
    p.__shady.nextSibling = n;
  }
  if (n) {
    n.__shady = n.__shady || {};
    n.__shady.previousSibling = p;
  }
  // When an element is removed, logical data is no longer tracked.
  // Explicitly set `undefined` here to indicate this. This is disginguished
  // from `null` which is set if info is null.
  node.__shady.parentNode = node.__shady.previousSibling =
    node.__shady.nextSibling = undefined;
  if (hasLogical(container, 'childNodes')) {
    // remove caching of childNodes
    container.__shady.childNodes = null;
  }
}

export let saveChildNodes = function(node) {
  if (!hasLogical(node, 'firstChild')) {
    node.__shady = node.__shady || {};
    node.__shady.firstChild = nativeTree.firstChild(node);
    node.__shady.lastChild = nativeTree.lastChild(node);
    let c$ = node.__shady.childNodes = nativeTree.childNodes(node);
    for (let i=0, n; (i<c$.length) && (n=c$[i]); i++) {
      n.__shady = n.__shady || {};
      n.__shady.parentNode = node;
      n.__shady.nextSibling = c$[i+1] || null;
      n.__shady.previousSibling = c$[i-1] || null;
    }
  }
}

let mixinImpl = {

  // Try to add node. Record logical info, track insertion points, perform
  // distribution iff needed. Return true if the add is handled.
  addNode(container, node, ref_node) {
    let ownerRoot = this.ownerShadyRootForNode(container);
    let ipAdded;
    if (ownerRoot) {
      // optimization: special insertion point tracking
      // TODO(sorvell): verify that the renderPending check here should not be needed.
      // if (node.__noInsertionPoint && !ownerRoot._renderPending) {
      if (node.__noInsertionPoint) {
        ownerRoot._skipUpdateInsertionPoints = true;
      }
      // note: we always need to see if an insertion point is added
      // since this saves logical tree info; however, invalidation state
      // needs
      ipAdded = this._maybeAddInsertionPoint(node, container, ownerRoot);
      // invalidate insertion points IFF not already invalid!
      if (ipAdded) {
        ownerRoot._skipUpdateInsertionPoints = false;
      }
    }
    if (hasLogical(container, 'firstChild')) {
      recordInsertBefore(node, container, ref_node);
    }
    // if not distributing and not adding to host, do a fast path addition
    // TODO(sorvell): revisit flow since `ipAdded` needed here if
    // node is a fragment that has a patched QSA.
    let handled = this._maybeDistribute(node, container, ownerRoot, ipAdded) ||
      container.shadyRoot;
    return handled;
  },

  // Try to remove node: update logical info and perform distribution iff
  // needed. Return true if the removal has been handled.
  // note that it's possible for both the node's host and its parent
  // to require distribution... both cases are handled here.
  removeNode(node) {
    // important that we want to do this only if the node has a logical parent
    let logicalParent = hasLogical(node, 'parentNode') &&
      getLogical(node, 'parentNode');
    let distributed;
    let ownerRoot = this.ownerShadyRootForNode(node);
    if (logicalParent || ownerRoot) {
      // distribute node's parent iff needed
      distributed = this.maybeDistributeParent(node);
      if (logicalParent) {
        recordRemoveChild(node, logicalParent);
      }
      // remove node from root and distribute it iff needed
      let removedDistributed = ownerRoot &&
        this._removeDistributedChildren(ownerRoot, node);
      let addedInsertionPoint = (logicalParent && ownerRoot &&
        logicalParent.localName === ownerRoot.getInsertionPointTag());
      if (removedDistributed || addedInsertionPoint) {
        ownerRoot._skipUpdateInsertionPoints = false;
        ownerRoot.update();
      }
    }
    this._removeOwnerShadyRoot(node);
    return distributed;
  },


  _scheduleObserver(node, addedNode, removedNode) {
    let observer = node.__shady && node.__shady.observer;
    if (observer) {
      if (addedNode) {
        observer.addedNodes.push(addedNode);
      }
      if (removedNode) {
        observer.removedNodes.push(removedNode);
      }
      observer.schedule();
    }
  },

  removeNodeFromParent(node, parent) {
    if (parent) {
      this._scheduleObserver(parent, null, node);
      return this.removeNode(node);
    } else {
      this._removeOwnerShadyRoot(node);
    }
  },

  _hasCachedOwnerRoot(node) {
    return Boolean(node.__ownerShadyRoot !== undefined);
  },

  getRootNode(node) {
    if (!node || !node.nodeType) {
      return;
    }
    let root = node.__ownerShadyRoot;
    if (root === undefined) {
      if (utils.isShadyRoot(node)) {
        root = node;
      } else {
        let parent = node.parentNode;
        root = parent ? this.getRootNode(parent) : node;
      }
      // memo-ize result for performance but only memo-ize
      // result if node is in the document. This avoids a problem where a root
      // can be cached while an element is inside a fragment.
      // If this happens and we cache the result, the value can become stale
      // because for perf we avoid processing the subtree of added fragments.
      if (document.documentElement.contains(node)) {
        node.__ownerShadyRoot = root;
      }
    }
    return root;
  },

  ownerShadyRootForNode(node) {
    let root = this.getRootNode(node);
    if (utils.isShadyRoot(root)) {
      return root;
    }
  },

  _maybeDistribute(node, container, ownerRoot, ipAdded) {
    // TODO(sorvell): technically we should check non-fragment nodes for
    // <content> children but since this case is assumed to be exceedingly
    // rare, we avoid the cost and will address with some specific api
    // when the need arises.  For now, the user must call
    // distributeContent(true), which updates insertion points manually
    // and forces distribution.
    let insertionPointTag = ownerRoot && ownerRoot.getInsertionPointTag() || '';
    let fragContent = (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) &&
      !node.__noInsertionPoint &&
      insertionPointTag && node.querySelector(insertionPointTag);
    let wrappedContent = fragContent &&
      (fragContent.parentNode.nodeType !==
      Node.DOCUMENT_FRAGMENT_NODE);
    let hasContent = fragContent || (node.localName === insertionPointTag);
    // There are 3 possible cases where a distribution may need to occur:
    // 1. <content> being inserted (the host of the shady root where
    //    content is inserted needs distribution)
    // 2. children being inserted into parent with a shady root (parent
    //    needs distribution)
    // 3. container is an insertionPoint
    if (hasContent || (container.localName === insertionPointTag) || ipAdded) {
      if (ownerRoot) {
        // note, insertion point list update is handled after node
        // mutations are complete
        ownerRoot.update();
      }
    }
    let needsDist = this._nodeNeedsDistribution(container);
    if (needsDist) {
      container.shadyRoot.update();
    }
    // Return true when distribution will fully handle the composition
    // Note that if a content was being inserted that was wrapped by a node,
    // and the parent does not need distribution, return false to allow
    // the nodes to be added directly, after which children may be
    // distributed and composed into the wrapping node(s)
    return needsDist || (hasContent && !wrappedContent);
  },

  /* note: parent argument is required since node may have an out
  of date parent at this point; returns true if a <content> is being added */
  _maybeAddInsertionPoint(node, parent, root) {
    let added;
    let insertionPointTag = root.getInsertionPointTag();
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE &&
      !node.__noInsertionPoint) {
      let c$ = node.querySelectorAll(insertionPointTag);
      for (let i=0, n, np, na; (i<c$.length) && (n=c$[i]); i++) {
        np = n.parentNode;
        // don't allow node's parent to be fragment itself
        if (np === node) {
          np = parent;
        }
        na = this._maybeAddInsertionPoint(n, np, root);
        added = added || na;
      }
    } else if (node.localName === insertionPointTag) {
      saveChildNodes(parent);
      saveChildNodes(node);
      added = true;
    }
    return added;
  },

  _nodeNeedsDistribution(node) {
    return node && node.shadyRoot &&
      node.shadyRoot.hasInsertionPoint();
  },

  _removeDistributedChildren(root, container) {
    let hostNeedsDist;
    let ip$ = root._insertionPoints;
    for (let i=0; i<ip$.length; i++) {
      let insertionPoint = ip$[i];
      if (this._contains(container, insertionPoint)) {
        let dc$ = insertionPoint.assignedNodes({flatten: true});
        for (let j=0; j<dc$.length; j++) {
          hostNeedsDist = true;
          let node = dc$[j];
          let parent = nativeTree.parentNode(node);
          if (parent) {
            nativeMethod(parent, 'removeChild', [node]);
          }
        }
      }
    }
    return hostNeedsDist;
  },

  _contains(container, node) {
    while (node) {
      if (node == container) {
        return true;
      }
      node = node.parentNode;
    }
  },

  _removeOwnerShadyRoot(node) {
    // optimization: only reset the tree if node is actually in a root
    if (this._hasCachedOwnerRoot(node)) {
      let c$ = node.childNodes;
      for (let i=0, l=c$.length, n; (i<l) && (n=c$[i]); i++) {
        this._removeOwnerShadyRoot(n);
      }
    }
    node.__ownerShadyRoot = undefined;
  },

  // TODO(sorvell): This will fail if distribution that affects this
  // question is pending; this is expected to be exceedingly rare, but if
  // the issue comes up, we can force a flush in this case.
  firstComposedNode(insertionPoint) {
    let n$ = insertionPoint.assignedNodes({flatten: true});
    let root = this.getRootNode(insertionPoint);
    for (let i=0, l=n$.length, n; (i<l) && (n=n$[i]); i++) {
      // means that we're composed to this spot.
      if (root.isFinalDestination(insertionPoint, n)) {
        return n;
      }
    }
  },

  clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  },

  maybeDistributeParent(node) {
    let parent = node.parentNode;
    if (this._nodeNeedsDistribution(parent)) {
      parent.shadyRoot.update();
      return true;
    }
  },

  maybeDistributeAttributeChange(node, name) {
    if (name === 'slot') {
      this.maybeDistributeParent(node);
    } else if (node.localName === 'slot' && name === 'name') {
      let root = this.ownerShadyRootForNode(node);
      if (root) {
        root.update();
      }
    }
  },

  // NOTE: `query` is used primarily for ShadyDOM's querySelector impl,
  // but it's also generally useful to recurse through the element tree
  // and is used by Polymer's styling system.
  query(node, matcher, halter) {
    let list = [];
    this._queryElements(node.childNodes, matcher,
      halter, list);
    return list;
  },

  _queryElements(elements, matcher, halter, list) {
    for (let i=0, l=elements.length, c; (i<l) && (c=elements[i]); i++) {
      if (c.nodeType === Node.ELEMENT_NODE &&
          this._queryElement(c, matcher, halter, list)) {
        return true;
      }
    }
  },

  _queryElement(node, matcher, halter, list) {
    let result = matcher(node);
    if (result) {
      list.push(node);
    }
    if (halter && halter(result)) {
      return result;
    }
    this._queryElements(node.childNodes, matcher,
      halter, list);
  },

  activeElementForNode(node) {
    let active = getNative(document, 'activeElement');
    if (!active) {
      return null;
    }
    let isShadyRoot = !!(utils.isShadyRoot(node));
    if (node !== document) {
      // If this node isn't a document or shady root, then it doesn't have
      // an active element.
      if (!isShadyRoot) {
        return null;
      }
      // If this shady root's host is the active element or the active
      // element is not a descendant of the host (in the composed tree),
      // then it doesn't have an active element.
      if (node.host === active ||
          !node.host.contains(active)) {
        return null;
      }
    }
    // This node is either the document or a shady root of which the active
    // element is a (composed) descendant of its host; iterate upwards to
    // find the active element's most shallow host within it.
    let activeRoot = this.ownerShadyRootForNode(active);
    while (activeRoot && activeRoot !== node) {
      active = activeRoot.host;
      activeRoot = this.ownerShadyRootForNode(active);
    }
    if (node === document) {
      // This node is the document, so activeRoot should be null.
      return activeRoot ? null : active;
    } else {
      // This node is a non-document shady root, and it should be
      // activeRoot.
      return activeRoot === node ? active : null;
    }
  },

  renderRootNode(element) {
    var root = element.getRootNode();
    if (utils.isShadyRoot(root)) {
      root.render();
    }
  }

};

let nativeCloneNode = Element.prototype.cloneNode;
let nativeImportNode = Document.prototype.importNode;
let nativeRemoveAttribute = Element.prototype.removeAttribute;

export let setAttribute = function(attr, value) {
  // avoid scoping elements in non-main document to avoid template documents
  if (window.ShadyCSS && attr === 'class' && this.ownerDocument === document) {
    window.ShadyCSS.setElementClass(this, value);
  } else {
    nativeMethod(this, 'setAttribute', [attr, value]);
  }
}

function generateSimpleDescriptor(prop) {
  return {
    get() {
      let l = getLogical(this, prop);
      return l !== undefined ? l : nativeTree[prop](this);
    },
    configurable: true
  }
}

let assignedSlotDesc = {
  get() {
    return getLogical(this, 'assignedSlot') || null;
  },
  configurable: true
};

let NodeMixin = {

  appendChild(node) {
    return this.insertBefore(node);
  },

  // cases in which we may not be able to just do standard native call
  // 1. container has a shadyRoot (needsDistribution IFF the shadyRoot
  // has an insertion point)
  // 2. container is a shadyRoot (don't distribute, instead set
  // container to container.host.
  // 3. node is <content> (host of container needs distribution)
  insertBefore(node, ref_node) {
    if (ref_node) {
      let p = getLogical(ref_node, 'parentNode');
      if (p !== undefined && p !== this) {
        throw Error('The ref_node to be inserted before is not a child ' +
          'of this node');
      }
    }
    // remove node from its current position iff it's in a tree.
    if (node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      let parent = getLogical(node, 'parentNode');
      mixinImpl.removeNodeFromParent(node, parent);
    }
    if (!mixinImpl.addNode(this, node, ref_node)) {
      if (ref_node) {
        // if ref_node is an insertion point replace with first distributed node
        let root = mixinImpl.ownerShadyRootForNode(ref_node);
        if (root) {
          ref_node = ref_node.localName === root.getInsertionPointTag() ?
            mixinImpl.firstComposedNode(ref_node) : ref_node;
        }
      }
      // if adding to a shadyRoot, add to host instead
      let container = utils.isShadyRoot(this) ?
        this.host : this;
      if (ref_node) {
        nativeMethod(container, 'insertBefore', [node, ref_node]);
      } else {
        nativeMethod(container, 'appendChild', [node]);
      }
    }
    mixinImpl._scheduleObserver(this, node);
    return node;
  },

  /**
    Removes the given `node` from the element's `lightChildren`.
    This method also performs dom composition.
  */
  removeChild(node) {
    if (node.parentNode !== this) {
      throw Error('The node to be removed is not a child of this node: ' +
        node);
    }
    if (!mixinImpl.removeNode(node)) {
      // if removing from a shadyRoot, remove form host instead
      let container = utils.isShadyRoot(this) ?
        this.host :
        this;
      // not guaranteed to physically be in container; e.g.
      // undistributed nodes.
      let parent = nativeTree.parentNode(node);
      if (container === parent) {
        nativeMethod(container, 'removeChild', [node]);
      }
    }
    mixinImpl._scheduleObserver(this, null, node);
    return node;
  },

  replaceChild(node, ref_node) {
    this.insertBefore(node, ref_node);
    this.removeChild(ref_node);
    return node;
  },

  cloneNode(deep) {
    if (this.localName == 'template') {
      return nativeCloneNode.call(this, deep);
    } else {
      let n = nativeCloneNode.call(this, false);
      if (deep) {
        let c$ = this.childNodes;
        for (let i=0, nc; i < c$.length; i++) {
          nc = c$[i].cloneNode(true);
          n.appendChild(nc);
        }
      }
      return n;
    }
  }
};

Object.defineProperties(NodeMixin, {

  parentElement: generateSimpleDescriptor('parentElement'),

  parentNode: generateSimpleDescriptor('parentNode'),

  nextSibling: generateSimpleDescriptor('nextSibling'),

  previousSibling: generateSimpleDescriptor('previousSibling'),

  childNodes: {
    get() {
      if (hasLogical(this, 'firstChild')) {
        if (!this.__shady.childNodes) {
          this.__shady.childNodes = [];
          for (let n=this.firstChild; n; n=n.nextSibling) {
            this.__shady.childNodes.push(n);
          }
        }
        return this.__shady.childNodes;
      } else {
        return nativeTree.childNodes(this);
      }
    },
    configurable: true
  },

  firstChild: generateSimpleDescriptor('firstChild'),

  lastChild: generateSimpleDescriptor('lastChild'),

  textContent: {
    get() {
      if (hasLogical(this, 'firstChild')) {
        let tc = [];
        for (let i = 0, cn = this.childNodes, c; (c = cn[i]); i++) {
          if (c.nodeType !== Node.COMMENT_NODE) {
            tc.push(c.textContent);
          }
        }
        return tc.join('');
      } else {
        return nativeTree.textContent(this);
      }
    },
    set(text) {
      if (this.nodeType !== Node.ELEMENT_NODE) {
        // TODO(sorvell): can't do this if patch nodeValue.
        this.nodeValue = text;
      } else {
        mixinImpl.clearNode(this);
        if (text) {
          this.appendChild(document.createTextNode(text));
        }
      }
    },
    configurable: true
  }
});

// NOTE: For some reason `Text` redefines `assignedSlot`
let TextMixin = utils.extend({}, NodeMixin);
Object.defineProperties(TextMixin, {
  assignedSlot: assignedSlotDesc
})

let FragmentMixin = {

  // TODO(sorvell): consider doing native QSA and filtering results.
  querySelector(selector) {
    // match selector and halt on first result.
    let result = mixinImpl.query(this, function(n) {
      return utils.matchesSelector(n, selector);
    }, function(n) {
      return Boolean(n);
    })[0];
    return result || null;
  },

  querySelectorAll(selector) {
    return mixinImpl.query(this, function(n) {
      return utils.matchesSelector(n, selector);
    });
  }

};

let childrenDescriptor = {
  get() {
    if (hasLogical(this, 'firstChild')) {
      return Array.prototype.filter.call(this.childNodes, function(n) {
        return (n.nodeType === Node.ELEMENT_NODE);
      });
    } else {
      return nativeTree.children(this);
    }
  },
  configurable: true
};

let domParser = new DOMParser();

let insertDOMFrom = function(target, from) {
  let c$ = Array.from(from.childNodes);
  for (let i=0; i < c$.length; i++) {
    target.appendChild(c$[i]);
  }
}

let innerHTMLDescriptor = {
  get() {
    if (hasLogical(this, 'firstChild')) {
      return getInnerHTML(this);
    } else {
      return nativeTree.innerHTML(this);
    }
  },
  set(text) {
    mixinImpl.clearNode(this);
    let doc = domParser.parseFromString(text, 'text/html');
    if (doc.head) {
      insertDOMFrom(this, doc.head);
    }
    if (doc.body) {
      insertDOMFrom(this, doc.body);
    }
  },
  configurable: true
};

Object.defineProperties(FragmentMixin, {

  children: childrenDescriptor,

  innerHTML: innerHTMLDescriptor,

  firstElementChild: {
    get() {
      if (hasLogical(this, 'firstChild')) {
        let n = this.firstChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return nativeTree.firstElementChild(this);
      }
    },
    configurable: true
  },

  lastElementChild: {
    get() {
      if (hasLogical(this, 'lastChild')) {
        let n = this.lastChild;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return nativeTree.lastElementChild(this);
      }
    },
    configurable: true
  }

});

let SlotMixin = {
  assignedNodes(options) {
    if (this.localName === 'slot') {
      mixinImpl.renderRootNode(this);
      return this.__shady ?
        ((options && options.flatten ? this.__shady.distributedNodes :
        this.__shady.assignedNodes) || []) :
        [];
    }
  }
}

let ElementMixin = utils.extendAll({}, FragmentMixin, SlotMixin, {
  // importNode(externalNode, deep) {
  //   // for convenience use this node's ownerDoc if the node isn't a document
  //   let doc = this instanceof Document ? this :
  //     this.ownerDocument;
  //   let n = nativeImportNode.call(doc, externalNode, false);
  //   if (deep) {
  //     let c$ = externalNode.childNodes;
  //     for (let i=0, nc; i < c$.length; i++) {
  //       nc = doc.importNode(c$[i], true);
  //       n.appendChild(nc);
  //     }
  //   }
  //   return n;
  // },

  // TODO(sorvell): should only exist on <slot>

  setAttribute(name, value) {
    setAttribute.call(this, name, value);
    mixinImpl.maybeDistributeAttributeChange(this, name);
  },

  removeAttribute(name) {
    nativeRemoveAttribute.call(this, name);
    mixinImpl.maybeDistributeAttributeChange(this, name);
  }
});

Object.defineProperties(ElementMixin, {

  assignedSlot: assignedSlotDesc,

  shadowRoot: {
    get() {
      return this.shadyRoot;
    },
    set(value) {
      this.shadyRoot = value;
    },
    configurable: true
  },

  nextElementSibling: {
    get() {
      if (hasLogical(this, 'nextSibling')) {
        let n = this.nextSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.nextSibling;
        }
        return n;
      } else {
        return nativeTree.nextElementSibling(this);
      }
    },
    configurable: true
  },

  previousElementSibling: {
    get() {
      if (hasLogical(this, 'previousSibling')) {
        let n = this.previousSibling;
        while (n && n.nodeType !== Node.ELEMENT_NODE) {
          n = n.previousSibling;
        }
        return n;
      } else {
        return nativeTree.previousElementSibling(this);
      }
    },
    configurable: true
  },

  slot: {
    get() {
      return this.getAttribute('slot');
    },
    set(value) {
      this.setAttribute('slot', value);
    }
  }

});

let HTMLElementMixin = {};

Object.defineProperties(HTMLElementMixin, {

  children: childrenDescriptor,

  innerHTML: innerHTMLDescriptor

});

export let activeElementDescriptor = {
  get() {
    return mixinImpl.activeElementForNode(this);
  }
}

let ActiveElementMixin = {};
Object.defineProperties(ActiveElementMixin, {
  activeElement: activeElementDescriptor
});

let UnderActiveElementMixin = {};
Object.defineProperties(UnderActiveElementMixin, {
  _activeElement: activeElementDescriptor
});

export let MixinTypes = {
  NODE: 1,
  FRAGMENT: 2,
  ELEMENT: 3,
  DOCUMENT: 4
}

export let Mixins = {

  Node: NodeMixin,

  Fragment: FragmentMixin,

  Text: TextMixin,

  Slot: SlotMixin,

  Element: ElementMixin,

  HTMLElement: HTMLElementMixin,

  // Note: activeElement cannot be patched on document!
  Document: utils.extendAll({}, ElementMixin,
    UnderActiveElementMixin, ActiveElementMixin)

};

export let patchProto = function(proto, mixin, ifExists) {
  proto.__nativeProps = Object.create(proto.__nativeProps || {});
  let n$ = Object.getOwnPropertyNames(mixin);
  for (let i=0, n; (i<n$.length) && (n=n$[i]); i++) {
    let sd = Object.getOwnPropertyDescriptor(proto, n);
    if (sd) {
      if (!sd.configurable) {
        window.console.warn('Could not patch', n, 'on', proto);
        return;
      }
      proto.__nativeProps[n] = sd;
    }
    if (!ifExists || (sd && sd.configurable)) {
      let md = Object.getOwnPropertyDescriptor(mixin, n);
      Object.defineProperty(proto, n, md);
    }
  }
}

export let getRootNode = function(node) {
  return mixinImpl.getRootNode(node);
}

export function filterMutations(mutations, target) {
  const targetRootNode = getRootNode(target);
  return mutations.map(function(mutation) {
    const mutationInScope = (targetRootNode === getRootNode(mutation.target));
    if (mutationInScope && mutation.addedNodes) {
      let nodes = Array.from(mutation.addedNodes).filter(function(n) {
        return (targetRootNode === getRootNode(n));
      });
      if (nodes.length) {
        mutation = Object.create(mutation);
        Object.defineProperty(mutation, 'addedNodes', {
          value: nodes,
          configurable: true
        });
        return mutation;
      }
    } else if (mutationInScope) {
      return mutation;
    }
  }).filter(function(m) { return m});
}

// const promise = Promise.resolve();

class AsyncObserver {

  constructor() {
    this._scheduled = false;
    this.addedNodes = [];
    this.removedNodes = [];
    this.callbacks = new Set();
  }

  schedule() {
    if (!this._scheduled) {
      this._scheduled = true;
      utils.promish.then(() => {
        this.flush();
      });
    }
  }

  flush() {
    if (this._scheduled) {
      this._scheduled = false;
      let mutations = this.takeRecords();
      if (mutations.length) {
        this.callbacks.forEach(function(cb) {
          cb(mutations);
        });
      }
    }
  }

  takeRecords() {
    if (this.addedNodes.length || this.removedNodes.length) {
      let mutations = [{
        addedNodes: this.addedNodes,
        removedNodes: this.removedNodes
      }];
      this.addedNodes = [];
      this.removedNodes = [];
      return mutations;
    }
    return [];
  }

}

export let getComposedInnerHTML = function(node) {
  //if (hasLogical(node, 'firstChild')) {
    return getInnerHTML(node, (n) => getComposedChildNodes(n));
  // } else {
  //   return node.innerHTML;
  // }
}

let walker = document.createTreeWalker(document, NodeFilter.SHOW_ALL,
  null, false);
export let getComposedChildNodes = function(node) {
  let nodes = [];
  walker.currentNode = node;
  let n = walker.firstChild();
  while (n) {
    nodes.push(n);
    n = walker.nextSibling();
  }
  return nodes;
}

// TODO(sorvell): consider instead polyfilling MutationObserver
// directly so that users do not have to fork their code.
// Supporting the entire api may be challenging: e.g. filtering out
// removed nodes in the wrong scope and seeing non-distributing
// subtree child mutations.
export let observeChildren = function(node, callback) {
  utils.common.patchNode(node);
  if (!node.__shady.observer) {
    node.__shady.observer = new AsyncObserver();
  }
  node.__shady.observer.callbacks.add(callback);
  let observer = node.__shady.observer;
  return {
    _callback: callback,
    _observer: observer,
    _node: node,
    takeRecords() {
      return observer.takeRecords()
    }
  };
}

export let unobserveChildren = function(handle) {
  let observer = handle && handle._observer;
  if (observer) {
    observer.callbacks.delete(handle._callback);
    if (!observer.callbacks.size) {
      handle._node.__shady.observer = null;
    }
  }
}