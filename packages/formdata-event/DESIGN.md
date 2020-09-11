# `formdata` event polyfill

## Background

The [`formdata` event][formdata-event] is dispatched to a `<form>` element when
it is submitted. This event comes with a [`FormData` object][formdata-object]
holding key-value pairs representing the data that would be submitted and is
pre-populated with data that the browser extracts from elements it implements
natively, such as `<input>` and other [submittable
elements][submittable-elements]. This `FormData` object has an API that lets
scripts modify it by adding, updating, or removing
fields.[<sup>1</sup>](#footnote-1)

Without the `formdata` event, an author building a custom component that is
meant to add extra fields to form-submitted data would run into a problem: the
browser does not know how to extract the data from their component or even how
to learn if the component contains this kind of data in the first place. The
`formdata` event helps with this scenario by providing authors with (a) a signal
that a form is about to be submitted and (b) a means of manipulating the data
that will be sent during that submission. An author can listen for the
`formdata` event and use the attached FormData object to add their component's
data to the submitted data.

## Design

### Objective

The objective of the polyfill is to effectively implement the `formdata` event
in browsers that do not support it natively by modifying existing global APIs.
To do this, the polyfill will need to (a) notice when any form is about to be
submitted, (b) dispatch a `formdata` event to the form to potentially collect
updates to the submitted data, and (c) cause the submitted data to reflect the
updates given during the `formdata` event dispatch.


### Learning about form submissions

The `formdata` event is defined to be dispatched during [HTML's "construct the
entry list" algorithm][construct-the-entry-list], which is called during [form
submission][concept-form-submit]. A user can submit a form by activating a
[submit button][submit-button] or through [implicit
submission][implicit-submission] and an author can submit a form by simulating
the user behavior or by calling either of the form's [`submit`][dom-form-submit]
or [`requestSubmit`][dom-form-requestsubmit] functions.

All means of triggering a form submission, except calling the `submit` function,
will cause a `submit` event to be dispatched to the `<form>` element. The data
to be sent with the form is collected by the browser immediately after the
`submit` event finishes propagating through its path. This means the polyfill
can detect that a form is about to be submitted by listening for `submit` events
as well as modifying forms' `submit` methods and respond by dispatching the
`formdata` event.


#### Handling forms' `submit` function

When a script calls a form's `submit` function, that form is submitted without
dispatching a `submit` event.[<sup>2</sup>](#footnote-2) To dispatch the
`formdata` event in this case, forms' `submit` function
(`HTMLFormElement.prototype.submit`) will be overwritten to dispatch the event
before the wrapped, original function is called.


#### Listening for `submit` events

To learn about a submission through a `submit` event, a `submit` event listener
needs to be added to an event target in the path of that event. Conveniently,
the `submit` and `formdata` events are both non-composed and bubbling as well as
dispatched to the same target (the form). This means that, for any event target
with a `formdata` event listener, any `submit` event that would be followed by a
`formdata` event will propagate through the `submit` event listeners on the
target or one of its ancestors within the same root, at least: `submit` events
that don't propagate through the target or its ancestors would only followed by
a `formdata` event that does not propagate through the target either.

The polyfill listens for relevant `submit` events in two ways:

First, whenever a `formdata` event listener is added to any event target, it
also adds a capturing `submit` event listener to that target. This guarantees
that at least one `submit` event listener will be in the path of any relevant
`submit` events.

Second, when the user adds any `submit` event listener, the provided callback is
wrapped with a function that (after calling the original) checks if anything
happened to the event that might prevent it from reaching the `submit` event
listener added to the target of the `formdata` event listener mentioned earlier.
This can happen when the user calls `stopPropagation` or
`stopImmediatePropagation` (or sets `cancelBubble`, which is equivalent to
calling `stopPropagation`).

The combination of adding a `submit` listener to every target with a `formdata`
listener and wrapping all `submit` listeners guarantees that every form
submission that should cause a `formdata` event to be triggered that has an
event target with a `formdata` event listener in its path will be detected.


#### The `submit` event and timing

The time at which the browser collects the data it will submit is critical to
how the polyfill works. From the perspective of scripts on the page (e.g. the
polyfill), this data is collected [immediately after the `submit` event finishes
propagating][concept-form-submit]. This means that a script needs to be able to
finish updating the data before the last `submit` event listener along its path
returns for those modifications to be reflected in the submitted data.

To be sure that the `formdata` event is dispatched after any user-added `submit`
listeners are run, the capturing `submit` listener mentioned in [_Listening for
`submit` events_](#listening-for-submit-events) doesn't dispatch the `formdata`
event itself. Instead, it adds a new bubbling `submit` listener to the last
element in the path of the event to guarantee that at least one bubbling
`submit` listener is there when the event reaches it. This capturing `submit`
listener is also wrapped with the same function as all user-added `submit`
listeners and, in addition to handling `stopPropagation`, the wrapper will also
dispatch a `formdata` event after calling the wrapped function if both the event
is at the last target in its path and it wraps the last bubbling `submit`
listener added to that target.


### Dispatching the `formdata` event and collecting data

One of the `submit` event listeners mentioned above (or a form's modified
`submit` function) will eventually determine that a `formdata` event needs to be
dispatched and will kick off the process synchronously - just before either the
`submit` event listener returns or the wrapped `submit` function is called.

The actual process the polyfill uses for dispatching the `formdata` event itself
is straightforward: a new `FormDataEvent` type (matching [the API defined in the
HTML spec][formdataevent-interface]) is added to the global namespace and an
instance of this type is created with type `formdata` and dispatched to the
form. This `FormDataEvent` has a `formData` property that a
[`FormData`][formdata-interface] instance, which is pre-populated with the data
from submittable elements in the form.

Conveniently, constructing a `FormData` instance by passing a `<form>` element
will synchronously collect data from the form's submittable elements and
populate the instance. This instance is then set as the `FormDataEvent`'s
`formData` property and dispatched to the form. However, given that this
`FormData` is created by the polyfill, modifying it has no direct effect on the
data submitted with the form - the state of the form's submittable elements is
still the only data that will be sent with the form submission. To collect these
updates, the polyfill wraps all functions it finds on the `FormData` prototype
that can modify the data and keeps track of any modifications made. Then, in the
next step, it reflects these changes to the DOM.


### Reflecting FormData updates to the submitted data

After the `formdata` event has finished propagating, the polyfill will look at
the updates to the `FormData` instance and update the DOM tree below the form to
match. As mentioned earlier, functions on `FormData`'s prototype have been
wrapped to record all updates. These records are then iterated to decide how to
modify the form, either by disabling existing elements or adding new hidden
`<input>` elements at specific points in the form that will cause the submitted
data to match what a browser with native support for the `formdata` event would
send.

Again, these modifications are made synchronously, before either the `submit`
event finishes propagating or the form's wrapped `submit` method is called.


#### Cleaning up form modifications

When a form is submitted, the browsing context navigates, which discards the
state of the page from which the form was submitted - there's normally no need
to clean up the form. However, as a precaution, the polyfill queues a task that
removes any hidden inputs and resets the disabled state of any elements it
modified earlier.


## Other Notes

### Elements that care about the `formdata` event are not in its path

One thing that might seem strange about using the `formdata` event is that a
form's submittable elements[<sup>3</sup>](#footnote-3) are all descendants of
the form but the `formdata` event's target is the form itself. This means that
submittable elements mimicking the behavior of those from the HTML spec will
never be on the path of `formdata` events for the form they intend to be
submitted with. To work around this, component authors should find the closest
form to their component in the same root and add their `formdata` listener
there. If the component is only targeting newer browsers (i.e. Safari), it can
use `Element.prototype.closest` (i.e. as `this.closest('form')`).


### The polyfill does not add new methods to `FormData`

This polyfill only adds support for the `formdata` event itself - it does not
attempt to add new functionality to the `FormData` type. More concretely, if the
browser's `FormData` type does not support (e.g.) the `set` function, the
polyfill will not add it. This is intentional and is to maintain compatibility
with XHR's `send` function, which accepts a `FormData` instance containing data
to send. `append` is the only commonly supported `FormData` function and can't
be used to implement `set` and `delete`. 'Adding' these functions would mean
that incorrect data would be sent if a `FormData` instance modified with them
was passed to an XHR.


---

<sup id="footnote-1">1</sup> The FormData API is supported at various levels
across browsers, but all browsers that the web components polyfills cover at
least support appending additional data.

<sup id="footnote-2">2</sup> See the _submitted from `submit()` method_ flag in
[the form submission algorithm][concept-form-submit].

<sup id="footnote-3">3</sup> 'Submittable elements' is used in a generic sense
here, not strictly as the definition from the HTML spec.


[concept-form-submit]: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-form-submit
[construct-the-entry-list]: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-the-form-data-set
[dom-form-requestsubmit]: https://html.spec.whatwg.org/multipage/forms.html#dom-form-requestsubmit
[dom-form-submit]: https://html.spec.whatwg.org/multipage/forms.html#dom-form-submit
[formdata-event]: https://html.spec.whatwg.org/multipage/indices.html#event-formdata
[formdata-interface]: https://xhr.spec.whatwg.org/#interface-formdata
[formdata-object]: https://xhr.spec.whatwg.org/#interface-formdata
[formdataevent-interface]: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#the-formdataevent-interface
[implicit-submission]: https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission
[submit-button]: https://html.spec.whatwg.org/multipage/forms.html#concept-submit-button
[submittable-elements]: https://html.spec.whatwg.org/multipage/forms.html#category-submit
