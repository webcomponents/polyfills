/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import * as nativeTreeWalker from './native-tree-walker.js';
import * as nativeTreeAccessors from './native-tree-accessors.js';
import * as utils from './utils.js';

const useNativeAccessors = utils.settings.useNativeAccessors;

export let parentNode = useNativeAccessors ? nativeTreeAccessors.parentNode :
  nativeTreeWalker.parentNode;

export let firstChild = useNativeAccessors ? nativeTreeAccessors.firstChild :
nativeTreeWalker.firstChild;

export let lastChild = useNativeAccessors ? nativeTreeAccessors.lastChild :
nativeTreeWalker.lastChild;

export let previousSibling = useNativeAccessors ? nativeTreeAccessors.previousSibling :
nativeTreeWalker.previousSibling;

export let nextSibling = useNativeAccessors ? nativeTreeAccessors.nextSibling :
nativeTreeWalker.nextSibling;

export let childNodes = useNativeAccessors ? nativeTreeAccessors.childNodes :
nativeTreeWalker.childNodes;

export let parentElement = useNativeAccessors ? nativeTreeAccessors.parentElement :
nativeTreeWalker.parentElement;

export let firstElementChild = useNativeAccessors ? nativeTreeAccessors.firstElementChild :
nativeTreeWalker.firstElementChild;

export let lastElementChild = useNativeAccessors ? nativeTreeAccessors.lastElementChild :
nativeTreeWalker.lastElementChild;

export let previousElementSibling = useNativeAccessors ? nativeTreeAccessors.previousElementSibling :
nativeTreeWalker.previousElementSibling;

export let nextElementSibling = useNativeAccessors ? nativeTreeAccessors.nextElementSibling :
nativeTreeWalker.nextElementSibling;

export let children = useNativeAccessors ? nativeTreeAccessors.children :
nativeTreeWalker.children;

export let innerHTML = useNativeAccessors ? nativeTreeAccessors.innerHTML :
nativeTreeWalker.innerHTML;

export let textContent = useNativeAccessors ? nativeTreeAccessors.textContent :
nativeTreeWalker.textContent;