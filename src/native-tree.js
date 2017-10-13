/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as nativeTreeWalker from './native-tree-walker.js'
import * as nativeTreeAccessors from './native-tree-accessors.js'
import * as utils from './utils.js';

const hasDescriptors = utils.settings.hasDescriptors;

export let parentNode = hasDescriptors ? nativeTreeAccessors.parentNode :
  nativeTreeWalker.parentNode;

export let firstChild = hasDescriptors ? nativeTreeAccessors.firstChild :
nativeTreeWalker.firstChild;

export let lastChild = hasDescriptors ? nativeTreeAccessors.lastChild :
nativeTreeWalker.lastChild;

export let previousSibling = hasDescriptors ? nativeTreeAccessors.previousSibling :
nativeTreeWalker.previousSibling;

export let nextSibling = hasDescriptors ? nativeTreeAccessors.nextSibling :
nativeTreeWalker.nextSibling;

export let childNodes = hasDescriptors ? nativeTreeAccessors.childNodes :
nativeTreeWalker.childNodes;

export let parentElement = hasDescriptors ? nativeTreeAccessors.parentElement :
nativeTreeWalker.parentElement;

export let firstElementChild = hasDescriptors ? nativeTreeAccessors.firstElementChild :
nativeTreeWalker.firstElementChild;

export let lastElementChild = hasDescriptors ? nativeTreeAccessors.lastElementChild :
nativeTreeWalker.lastElementChild;

export let previousElementSibling = hasDescriptors ? nativeTreeAccessors.previousElementSibling :
nativeTreeWalker.previousElementSibling;

export let nextElementSibling = hasDescriptors ? nativeTreeAccessors.nextElementSibling :
nativeTreeWalker.nextElementSibling;

export let children = hasDescriptors ? nativeTreeAccessors.children :
nativeTreeWalker.children;

export let innerHTML = hasDescriptors ? nativeTreeAccessors.innerHTML :
nativeTreeWalker.innerHTML;

export let textContent = hasDescriptors ? nativeTreeAccessors.textContent :
nativeTreeWalker.textContent;