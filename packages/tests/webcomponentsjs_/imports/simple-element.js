/*
@license
Copyright(c) 2016 The Polymer Project Authors.All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// Kick off shady CSS.
var template = document.createElement('template');
template.innerHTML =
`
<style>:host {color: blue;} .red-text {color: red;} </style>
<p class="red-text">Shadow DOM</p>
<slot id="slot"></slot>
`;
if (template) {
  if (window.ShadyCSS) {
    window.ShadyCSS.prepareTemplate(template, 'simple-element');
  }
}

class SimpleElement extends HTMLElement {
  constructor() {
    super();
    this.bestName = 'batman';
    if (window.ShadyCSS) {
      window.ShadyCSS.styleElement(this);
    }

    if (template && !this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.appendChild(document.importNode(template.content, true));
    }
  }
}

window.customElements.define('simple-element', SimpleElement);