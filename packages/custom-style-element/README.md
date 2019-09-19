# Custom Style Element
The custom-style element provides support for document level styles to declare css variables for use in custom elements in older browsers (IE11).

# Requirements
custom-style-interface from @webcomponents/shadycss, support for custom elements via @webcomponents/custom-elements

# Usage
When you need to declare css variables outside of a custom element's styles, in index.html for example:
```html
<custom-style>
  <style>
    html {
      --foo: pink;
      --bar: blue;
    }
  </style>
</custom-style>
<script src="path/to/custom-style-element.min.js"></script>
```
