/**
@license
Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

export const black = 'rgb(0, 0, 0)';
export const red = 'rgb(255, 0, 0)';
export const green = 'rgb(0, 128, 0)';
export const blue = 'rgb(0, 0, 255)';

export const pierce = (...selectors) => {
  let node = document.body;
  if (selectors[0] instanceof Node) {
    // Allow the first argument to be a start node.
    node = selectors.shift();
  }
  while (selectors.length > 0) {
    const selector = selectors.shift();
    node = (node.shadowRoot || node).querySelector(selector);
    if (node === null) {
      return null;
    }
  }
  return node;
};

export const style = (...selectors) => {
  const node = pierce(...selectors);
  if (node === null) {
    return null;
  }
  return getComputedStyle(node);
};

export const color = (...selectors) => style(...selectors).color;
