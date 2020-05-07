# ShadyDOM

ShadyDOM provides a shim for ShadowDOM V1. It is less correct but less intrusive
and faster than the ShadowDOM Polyfill.

## Usage

Usage of the shim is transparent when `attachShadow` is unavailable. Elements are
patched as needed to report ShadowDOM correct dom information. Only dom tree
accessors and mutation api is maintained. Some dom api
(for example MutationObservers) is not shimmed.

To force ShadyDOM to be used even when native ShadowDOM is available, set
the `ShadyDOM = {force: true}` in a script prior to loading the polyfill.

## Example

```html
<div id="host"></div>
<script>
  host.attachShadow({mode: 'open'});
  host.shadowRoot.appendChild(document.createElement('a'));
</script>

```

## Building and Testing

For building and testing, first run
```
npm install
npm run build
```

To test, run `npm test`


## Limitations

ShadyDOM distribution is asynchronous for performance reasons. This means that
the composed dom will be available 1 microtask after the dom mutation occurs.
For testing, `ShadyDOM.flush` may be called to force syncronous composition.

ShadowDOM compatible styling is *not* provided with the ShadyDOM shim. To
shim ShadowDOM styling, use the [shadycss](https://github.com/webcomponents/shadycss) shim.

On very old versions of Chrome and Safari, in rare cases `ShadyDOM.patch(node)`
must be called to properly set `textContent` or `innerHTML`. On these browsers,
element property accessors like `firstChild` and `textContent` cannot be
modified on the element prototype and instances must be patched. This is
automated but there are some cases that are not handled.
This should only be an issue when setting `textContent` or `innerHTML` on a
node inside a shadowRoot adds or removes a `<slot>` element.
In this case, the shadowRoot will not render correctly. To workaround this,
call `ShadyDOM.patch(node)` prior to setting `textContent` or `innerHTML`.
