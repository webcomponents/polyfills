# Scoped CustomElementRegistry polyfill prototype

## 🚨 Work in progress

This polyfill explores implementation of a non-finalized spec proposal and is
currently a work in progress.

## Overview

Scoped CustomElementRegistry polyfill based on discussion in
https://github.com/w3c/webcomponents/issues/716 and spec proposal in 
https://github.com/w3c/webcomponents/pull/865.

Technique: uses native CustomElements to register stand-in classes that
delegate to the constructor in the registry for the element's scope; this
avoids any manual treewalks to identify custom elements that need upgrading.
Constructor delegation is achieved by constructing a bare `HTMLElement`,
inspecting its tree scope (or the tree scope of the node it was created via) to
determine its registry, and then applying the "constructor call trick" to
upgrade it.

Notes/limitations:
- In order to leverage native CE when available, `observedAttributes` handling
  must be simulated by patching `setAttribute`/`getAttribute` to call
  `attributeChangedCallback` manually, since while we can delegate constructors,
  the `observedAttributes` respected by the browser are fixed at define time.
  This means that native reflecting properties are not observable when set via
  properties.
- In theory, this should be able to be layered on top of the Custom Elements
  polyfill for use on older browsers, although iis yet to be tested. Use of
  Reflect.construct may need to be modified in those cases
