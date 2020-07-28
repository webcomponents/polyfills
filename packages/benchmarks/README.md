# Polyfill Benchmarks

This sub-package contains benchmarks relevant to the Web Components Polyfills
using [Tachometer](https://github.com/Polymer/tachometer).

To run any of these benchmarks, run e.g.:

```bash
cd packages/benchmarks
npx tachometer --config=<path to benchmark json config>
```

## shadycss/shadowparts

### `add-remove-child.json`

Measures the time spent mutating a shadow root by adding and removing a child
node many times, and compares across:

  - `before`: A fixed version of ShadyCSS before any shadow parts support was added.
  - `head`: The code at HEAD.
  - `disabled`: The code at HEAD with shadow parts support force-disabled.

### `render-styled-part.json`

Measures the time spent inserting many times a parent and child element, where
the parent provides a part style to the child, and compares across:

  - `native`: Polyfill disabled.
  - `polyfill`: Polyfill enabled.