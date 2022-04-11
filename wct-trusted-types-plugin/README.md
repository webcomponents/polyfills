# WCT Trusted Types Plugin

This WCT plugin injects headers to enforce the Trusted Types API.

## Usage

Add `enforce-trusted-types` as a URL query parameter to enforce the use of the
Trusted Types API on that page:

```
http://localhost/path/to/wct/hosted/page.html?enforce-trusted-types
```

```
Content-Security-Policy: require-trusted-types-for 'script'
Content-Security-Policy: trusted-types
```

To allow only specific policy names, set the value of `enforce-trusted-types` to
a string with those specific policy names:

```
http://localhost/path/to/wct/hosted/page.html?enforce-trusted-types=policy1%20policy2
```

```
Content-Security-Policy: require-trusted-types-for 'script'
Content-Security-Policy: trusted-types policy1 policy2
```
