# Design

How the polyfill works, for maintainers. See the [README](README.md) for usage
and limitations.

## Goals

- Behave as the spec says, so code written against the polyfill works
  unchanged with native support.
- Do nothing where the browser's native support is complete.
- Stay small and avoid tree walks where possible.

## Stand-ins and the constructor-call trick

The browser has one native registry per window, so it can't know which
registry an element belongs to. For each tag name defined in any registry,
the polyfill defines a _stand-in_ class natively, once. The browser constructs
a stand-in wherever it would construct a custom element (parsing, cloning,
`createElement`, ...), so the polyfill never searches the DOM for elements to
upgrade.

When the element's registry is known, the polyfill looks up that registry's
definition and _customizes_ the stand-in: it calls the user's constructor on
it, with a patched `HTMLElement` returning the existing element from `super()`
(the "constructor-call trick"). The stand-in's lifecycle callbacks then
delegate to the definition of the element's own registry. An element with no
definition in its registry waits, while connected, for one.

Things the browser fixes per tag at define time (`observedAttributes`,
`formAssociated`, `disabledFeatures`) can't vary by registry, so the polyfill
emulates them: attribute callbacks via patched `setAttribute` and friends,
form-association via the stand-in plus filtering, disabled features via
checks in `attachShadow` and `attachInternals`.

## Each node's registry

A node's registry is either recorded or worked out from where it is:

- **Recorded** in a `WeakMap` whenever a polyfill API creates, clones or
  adopts a node, or attaches a shadow root.
- **Worked out** for a node without a record. Such a node was made by a
  parser, so it gets the parser's answer: its parent's registry, null if it
  has a null registry attribute, and for a declarative shadow root its
  document's registry. The answer is then recorded, so later moves don't
  change it.

Because the answer for an unrecorded node depends on its position, every
patched API that moves or removes nodes records their registries first.

## When elements are customized

A stand-in is queued when the browser constructs it, since its tree, and so
its registry, isn't known yet. Each patched API that can construct elements is
an _entry point_: it runs the native method, then flushes its queue, so
elements are customized before it returns, as natively. Entry points can
nest; each flushes only its own queue.

The main document's parser isn't an API call. A `MutationObserver` flushes
the queue once parsed elements are inserted, which is before any following
script runs. A microtask would be too early: the browser constructs the
element before setting its attributes or inserting it.

Anything else that constructs elements (e.g. `execCommand`) is flushed in a
microtask.

## Patched APIs

Roughly: element creation (`createElement`, `createElementNS`), insertion
and adoption (`appendChild`, `append`, `insertBefore`, `replaceWith`,
`adoptNode`, `Range.insertNode`, ...), parsing (`innerHTML`, `outerHTML`,
`insertAdjacentHTML`, `setHTMLUnsafe`, `createContextualFragment`, ...),
cloning (`cloneNode`, `importNode`, `Range.cloneContents`,
`Range.extractContents`), `attachShadow`, `attachInternals`, and the
attribute and form APIs mentioned above.

## Cloning

The browser clones nodes without saying which copy came from which source.
The polyfill pairs them by position: the source's and the copy's elements, in
tree order, line up one to one. Each copy gets the registry the spec gives it:
its source's, or, if that's a global registry, its document's global
registry (null in a document with a scoped registry).
Shadow roots are paired the same way. A closed root on a host that wasn't a
custom element can't be reached on the copy; it keeps only the root's
registry.

## Adoption

Moving a node into another document changes null and global registries as
the spec says, to an _effective global registry_: the new document's global
registry, or null if the document's registry is scoped. Scoped registries are
kept. Patched insertion methods apply this before the native move.

The polyfill's state is shared by same-origin windows, so nodes moved between
them work as natively.

## Native support

On load, the polyfill checks that native support is complete: a null
registry is inherited by parsed children, set by the declarative attributes,
and keeps an element from being customized with a global definition. If so,
it does nothing, unless `force` is set. Safari currently fails these checks,
so it uses the polyfill.
