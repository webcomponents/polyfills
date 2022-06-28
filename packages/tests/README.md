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

## Why does the `webcomponentsjs_` directory name end with a `_`?

`polyserve`, the server used internally by `web-component-tester` (WCT), will
not compile code for URLs containing `"webcomponentsjs"` as a path segment.[^2]

[^2]: <https://github.com/Polymer/tools/blob/8a90f5893bd4298c40b0343bdc1b15f18f78881c/packages/polyserve/src/compile-middleware.ts#L70-L74>
