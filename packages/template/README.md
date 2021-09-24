# template

A minimal polyfill for `<template>`.

## Known limitations

### Template nodes in main document are upgraded after `DOMContentLoaded`

The first timepoint in which the polyfill can be certain the main document is loaded is `DOMContentLoaded`.
As such, we use this timepoint to bootstrap any `<template>` as defined in the main document.
This means that any scripts in the main document that run before this event (e.g. inline scripts) will not have the properly upgraded templates.
Instead, listen for `DOMContentLoaded` yourself and only after that interact with any `<template>` in the main document.

## License

Everything in this repository is BSD style license unless otherwise specified.

Copyright (c) 2016 The Polymer Authors. All rights reserved.
