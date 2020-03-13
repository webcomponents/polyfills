# Shadow Parts in ShadyCSS

CSS Shadow Parts ([spec](https://www.w3.org/TR/css-shadow-parts-1/)) allow
shadow roots to selectively expose shadow children for styling from outside
scopes.

## Limitations

ShadyCSS supports the `part` attribute, the `exportparts` attribute, and the
`::part` CSS selector, but with some limitations:

#### 1. Type selector is required

Unlike the spec, `::part` rules <i>must</i> include a type selector (i.e. a
custom element name). ShadyCSS relies on this hint to understand which scope
each rule will flow to, without querying the DOM.

<table>
  <tr>
    <th>Supported</th>
    <th>Unsupported</th>
  </tr>
  <tr>
    <td>
      <code><b>x-a</b>::part(greeting)</code><br><br>
      <code><b>x-a</b>#foo.bar::part(greeting)</code>
    </td>
    <td>
      <code>::part(greeting)</code><br><br>
      <code>#foo.bar::part(greeting)</code>
    </td>
  </tr>
</table>

#### 2. Specificity is crude

The cascade/specificity behavior of `::part` rules is much more crude than the
spec. `::part` rules are transformed to be `!important`, and otherwise there is
no guarantee about precedence (actual behavior will depend largely on the order
in which templates are processed).

ShadyCSS rank (high to low):

1. parent, grandparent, etc. scopes (no guarantee about order)
2. local scope (if marked `!important`, local rules join group above)

Spec rank (high to low):

1. `!important` grandparent scope
2. `!important` parent scope
3. `!important` local scope
4. grandparent scope
5. parent scope
6. local scope

To workaround this limitation, you can increase the rank of any rule by
adding additional selectors, such as `#id` and `.class` selectors.

#### 3. Recursion is crude

Certain "recursive" DOM structures will behave unexpectedly.

In the example below, the spec-compliant behavior would display the `1 2 3`
sequence with colors `red green red`, but ShadyCSS will produce `red green
green`.

```html
<x-a>
  #shadow-root
    <style>
      x-a.odd::part(num) {
        color: red;
      }
      x-a.even::part(num) {
        color: green;
      }
    </style>

    <x-a class="odd">
      #shadow-root
        <style> <!-- as above --> </style>
        <span part="num">1</num>

        <x-a class="even">
          #shadow-root
            <style> <!-- as above --> </style>
            <span part="num">2</num>

            <x-a class="odd">
              #shadow-root
                <span part="num">3</num>
            </x-a>
        </x-a>
    </x-a>
```

This happens because the `::part` rules are hoisted to the document scope and
represented as shown below, thus there is no "resetting" after the second rule
has matched an ancestor:

```css
x-a x-a.odd[shady-part~="x-a:x-a:num"] {
  color: red;
}
x-a x-a.even[shady-part~="x-a:x-a:num"] {
  color: green;
}
```

Workarounds will vary based on specific scenario. For the above example, a good
workaround would be to use two unique part names: `numOdd`, `numEven`.

## How it works

The basic approach is to convert `::part` rules to attribute selectors that
encode the _providing_ scope, the _receiving_ scope, and the part name. Each
shadow host then discovers its parent scope, and applies the correct attribute
to each of its part nodes.

Native:

```html
<x-a>
  #shadow-root
    <style>
      x-b::part(greeting) {
        color: red;
      }
    </style>
    <x-b>
      #shadow-root
        <div part="greeting">Hello</div>
    </x-b>
</x-a>
```

ShadyCSS:

```html
<style>
  x-a x-b [shady-part~="x-a:x-b:greeting"] {
    color: red;
  }
</style>

<x-a>
  <x-b>
    <div shady-part="x-a:x-b:greeting">Hello</div>
  </x-b>
</x-a>
```

### Document styles

As is standard in ShadyCSS, document-level styles must be opted-in with
`ShadyCSS.CustomStyleInterface.addCustomStyle`. The first component of a shimmed
document-level `::part` style rule will be literally `document`:

```html
<div shady-part="document:x-b:greeting">
```

### Multiple parts

When a `::part` rule lists multiple space-separated part names, then only part
nodes with all of those part names match. This is emulated with:

Native:

```css
x-b::part(foo bar) {
  color: red;
}
```

ShadyCSS:

```css
x-a x-b [shady-part~="x-a:x-b:foo"][shady-part~="x-a:x-b:bar"] {
  color: red;
}
```

### Exportparts

In the basic form, `::part` rules only flow down one hop in the scope tree, to a
shadow root's children. The `exportparts` attribute is used to propagate styles
more deeply.

ShadyCSS emulates `exportparts` by walking up the DOM for each instance (when
`styleElement` is called), following `exportparts` attributes. This is cached,
so each shadow root only needs to be walked once even there are multiple parts
below it. For each relevant scope, an additional `shady-part` attribute is added
to part nodes.

Native:

```html
<x-a>
  #shadow-root
    <style>
      x-b::part(salutation) {
        color: red;
      }
    </style>
    <x-b>
      #shadow-root
        <style>
          x-c::part(greeting) {
            font-weight: bold;
          }
        </style>
        <x-c exportparts="greeting:salutation">
          #shadow-root
            <div part="greeting">Hello</div>
        </x-c>
    </x-b>
</x-a>
```

ShadyCSS:

```html
<style>
  x-a x-b [shady-part~="x-a:x-b:salutation"] {
    color: red;
  }
  x-b x-c [shady-part~="x-b:x-c:greeting"] {
    font-weight: bold;
  }
</style>

<x-a>
  <x-b>
    <x-c>
      <div shady-part="x-b:x-c:greeting
                       x-a:x-b:salutation">Hello</div>
    </x-c>
  </x-b>
</x-a>
```

### Custom properties

The spec behavior is that when a `::part` rule consumes a CSS Custom Property,
the value of that property is determined at each site where that rule is
_consumed_, not where the rule was _defined_.

ShadyCSS emulates this behavior by switching to per-instance styling for any
node that receives a `::part` rule that consumes a CSS Custom Property. This is
identical to the behavior already used for normal custom property consumption in
ShadyCSS, where each such host is given a class that is unique for its set of
property values.

Native:

```html
<x-a>
  #shadow-root
    <style>
      x-b::part(greeting) {
        color: var(--custom-color);
      }
    </style>

    <x-b>
      #shadow-root
        <style>
          :host {
            --custom-color: red;
          }
        </style>
        <div part="greeting">Hello</div>
    </x-b>

    <x-b>
      #shadow-root
        <style>
          :host {
            --custom-color: blue;
          }
        </style>
        <div part="greeting">Hello</div>
    </x-b>
</x-a>
```

ShadyCSS:

```html
<style>
  x-a .x-b-1 [shady-part~="x-a:x-b:greeting"] {
    color: red;
  }
  x-a .x-b-2 [shady-part~="x-a:x-b:greeting"] {
    color: blue;
  }
</style>
<x-a>
  <x-b class="x-b-1">
    <div shady-part="x-a:x-b:greeting">Hello</div>
  </x-b>
  <x-b class="x-b-2">
    <div shady-part="x-a:x-b:greeting">Hello</div>
  </x-b>
</x-a>
```
