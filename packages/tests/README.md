# tests

## Why aren't the tests for each package located inside their respective packages?

Many of these are integration tests that require importing one or more other
packages from this repo. If these integration tests were located within their
respective packages, then those packages would need to reference each other in
their `devDependencies` field. However, some of these integration tests require
other packages from this repo such that there would be cycles in the dependency
graph.

If cycles are present in the dependency graph and the versions of other packages
in this repo referenced by `devDependencies` are not carefully managed so that
they stay mutually compatible with both the versions listed in other packages'
`devDependencies` fields and the `version` field in the referenced packages'
`package.json` files, then npm will download and install an older version of the
referenced package and Lerna will (correctly) refuse to replace these nested
copies with symlinks to the local packages.

To help avoid the scenario where tests might inadvertantly not be testing the
packages in the local repo, all tests in this repo have been moved to the
`tests` package here,[^1] which is private and has no dependents, and the repo's
root package runs Lerna's `bootstrap` step using the `--reject-cycles` option so
that cycles can't be reintroduced later. The versions used in this package's
`devDependencies` still need to be compatible with the version in each
referenced package's `package.json` for Lerna to bootstrap as intended, but
don't need to be managed collectively otherwise.

[^1]:
    The `scoped-custom-element-registry` package's tests were set up before
    there was intent to migrate this repo's tests to WTR, so it still contains its
    own tests. These should eventually be moved here too.

## Why are two imports required to set up the test environment in WTR tests?

The test environment is _intentionally_ imported into the test pages through two
separate entrypoints: one for polyfills that the test runner depends on and
another for the test runner itself.

`@web/test-runner-mocha` depends on a module that is _dynamically-generated_ by
the test server, so this compilation step must occur as server middleware.
Particularly, this compilation step can't happen partially at build time because
all modules in the same dependency graph need to be visible to the same
compilation tool to be linked correctly but the dynamically-generated module
does not exist on disk.

This dynamic module requires support for `fetch` as well as `URL` with both a
user-callable constructor and a `searchParams` property (implying
`URLSearchParams` support). Some of the browsers these packages are tested in do
not natively support these features so polyfills are required: `whatwg-fetch`
for `fetch` and `core-js` for `URL` (`core-js` was the only suitable candidate
found at the time for `URL`).

The required `core-js` polyfills are only available in Common JS format.
However, the server middleware used for module compilation does not support
Common JS, so `core-js` must be bundled in an earlier step by a tool that _is_
capable of compiling Common JS.

If `@web/test-runner-mocha` were included in the same bundle as `core-js` and
the bundler were instructed to output a single standard module that still
contains the import statement pointing to the dynamically-generated module
(because that module does not exist as a file on disk that the bundler could
read to include in the bundle), then the bundler would be forced to emit a
module that implicitly describes the entirety of that bundle executing only
_after_ the imported module. **This would cause the dynamically-generated module
that depends on the `core-js` polyfills to run before those polyfills are
installed, making this an unviable option.**

So, to work around this ordering problem and guarantee that the `core-js`
polyfills are (a) able to be bundled, (b) run before the dynamically-generated
module dependency of `@web/test-runner-mocha`, and (c) linked properly with
other modules in the dependency graph by use of a single compilation tool, the
test environment is split into two separately bundled standard modules.

The first module bundle contains polyfills required by `@web/test-runner-mocha`
and the second contains the modules that depend on those polyfills. These
polyfills are then included as separate import statements in each test file,
which guarantees that the server middleware is the one step where all modules
are compiled out. This gives that middleware full control of the loading order
of all modules, allowing it to properly delay the dynamically-generated module
from running until the polyfills it requires have loaded.

## Why does the `webcomponentsjs_` directory name end with a `_`?

`polyserve`, the server used internally by `web-component-tester` (WCT), will
not compile code for URLs containing `"webcomponentsjs"` as a path segment.[^2]

[^2]: <https://github.com/Polymer/tools/blob/8a90f5893bd4298c40b0343bdc1b15f18f78881c/packages/polyserve/src/compile-middleware.ts#L70-L74>
