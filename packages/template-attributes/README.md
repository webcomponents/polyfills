# Template Attributes polyfill prototype

## 🚨 Work in progress

This polyfill explores implementation of a non-finalized spec proposal and is
currently a work in progress.

## Overview

Template Attributes polyfill based on the <https://github.com/Symbitic/webcomponents/blob/template-attribute/proposals/Template-Attribute.md> proposal.

Technique: modifies HTMLElement to patch `attachShadow()` to attach a mutation observer and setup a proxy on the `.templates` property. While the mutation observer isn't required and is strictly an implementation detail, it is considerably more performant than running `querySelectorAll("*")` every time the `templates` property is changed.

## Demo

Run two commands in different windows/tabs inside the `./packages/template-attributes` folder:

    npx tsc --watch
    npx serve ./

Then open `http://<host>:<port>/demo` in a web browser. Edit `demo/index.html` and refresh the page to see the results.
