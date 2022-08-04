`logicalQuerySelectorAll` emulates `querySelectorAll` within Shady DOM's logical
tree by implementing the tree-traversal portion of a selector engine.

Consider querying for `a > b ~ c, d e` within this tree:

```
<a>
  <b></b>
  <x></x>
  <c id="c_1"></c>
  <d>
    <x>
      <e id="e_1"></e>
    </x>
    <b></b>
    <c id="c_2"></c>
  </d>
  <e id="e_2"></e>
</a>
```

First, the given selector list is split into complex selectors, which are each
split into compound selectors and combinators:

`'a > b ~ c, d e'` &rarr; `['a > b ~ c', 'd e']` &rarr;

```
[{
  compoundSelectors: ['a', 'b', 'c'],
  combinators: ['>', '~'],
}, {
  compoundSelectors: ['d', 'e'],
  combinators: [' '],
}]
```

Next, all exclusive descendants of the context element are tested against the
final compound selectors in each complex selector - in this example, `c` and
`e`. Any matches create an initial 'cursor', which tracks the progress of a
potential match. Cursors consist of a handful of properties:

- `target`: the element that would be considered matching if the cursor
  eventually results in a complete match

- `complexSelectorParts`: the split complex selector which the cursor is
  attempting to match

- `index`: the index into `.complexSelectorParts.compoundSelectors` of the last
  successfully matched compound selector

- `position`: the element which successfully matched the compound selector at
  `index`

This initial walk through the descendants of the context element results in an
initial list of cursors with `target`s which are in _document order_.

(The cursor 'properties' shown below are written in shorthand for compactness.)

```
cursors = [
  {target: #c_1, selector: 'a > b ~ c', index: 2, position: ...},
  {target: #e_1, selector: 'd e', index: 1, position: ...},
  {target: #c_2, selector: 'a > b ~ c', index: 2, position: ...},
  {target: #e_2, selector: 'd e', index: 1, position: ...},
]
```

```
<a>
  <b></b>
  <x></x>
  <c id="c_1"></c> <!-- cursors[0].position -->
  <d>
    <x>
      <e id="e_1"></e> <!-- cursors[1].position -->
    </x>
    <b></b>
    <c id="c_2"></c> <!-- cursors[2].position -->
  </d>
  <e id="e_2"></e> <!-- cursors[3].position -->
</a>
```

Next, the `position` and next combinator (iterating backwards) of each cursor
with `.index > 0` ('source' cursors) are used to determine the candidate
elements to test against that cursor's next compound selector.

```
cursors = [
  {target: #c_1, selector: 'a > b ~ c', index: 2, position: ...},
  {target: #e_1, selector: 'd e', index: 1, position: ...},
  {target: #c_2, selector: 'a > b ~ c', index: 2, position: ...},
  {target: #e_2, selector: 'd e', index: 1, position: ...},
]
```

```
<a> <!-- candidate: cursors[1], cursors[3] -->
  <b></b> <!-- candidate: cursors[0] -->
  <x></x> <!-- candidate: cursors[0] -->
  <c id="c_1"></c>
  <d> <!-- candidate: cursors[1] -->
    <x> <!-- candidate: cursors[1], cursors[2] -->
      <e id="e_1"></e>
    </x>
    <b></b> <!-- candidate: cursors[2] -->
    <c id="c_2"></c>
  </d>
  <e id="e_2"></e>
</a>
```

Candidates that do not match the next compound selector in the source cursor's
complex selector are filtered out. Those that do match result in a new cursor
being created with `position` set to the matching element and `index`
decremented by one, but with the same `target`, `complexSelectorParts` as the
source cursor. Then, source cursors are each replaced by any new cursors created
by their matching candidates. Specifically, all new cursors must maintain the
relative order of their source cursors so that their `target`s remain in
_document order_. Source cursors that had `.index === 0` remain in their
position in the list unchanged.

```
cursors = [
  {target: #c_1, selector: 'a > b ~ c', index: 1, position: ...},
  {target: #e_1, selector: 'd e', index: 0, position: ...},
  {target: #c_2, selector: 'a > b ~ c', index: 1, position: ...},
]
```

```
<a>
  <b></b> <!-- cursors[0].position -->
  <x></x>
  <c id="c_1"></c>
  <d> <!-- cursors[1].position -->
    <x>
      <e id="e_1"></e>
    </x>
    <b></b> <!-- cursors[2].position -->
    <c id="c_2"></c>
  </d>
  <e id="e_2"></e>
</a>
```

This process repeats until all (potentially zero) remaining cursors have `.index === 0`.

Again, candidates for cursors with `.index > 0` are selected.

```
cursors = [
  {target: #c_1, selector: 'a > b ~ c', index: 1, position: ...},
  {target: #e_1, selector: 'd e', index: 0, position: ...},
  {target: #c_2, selector: 'a > b ~ c', index: 1, position: ...},
]
```

```
<a> <!-- candidate: cursors[0] -->
  <b></b>
  <x></x>
  <c id="c_1"></c>
  <d> <!-- candidate: cursors[2] -->
    <x>
      <e id="e_1"></e>
    </x>
    <b></b>
    <c id="c_2"></c>
  </d>
  <e id="e_2"></e>
</a>
```

Again, the candidates are tested against their source cursors' next compound
selector to produce new cursors that replace the source cursors.

```
cursors = [
  {target: #c_1, selector: 'a > b ~ c', index: 0, position: ...},
  {target: #e_1, selector: 'd e', index: 0, position: ...},
]
```

```
<a> <!-- cursors[0].position -->
  <b></b>
  <x></x>
  <c id="c_1"></c>
  <d> <!-- cursors[1].position -->
    <x>
      <e id="e_1"></e>
    </x>
    <b></b>
    <c id="c_2"></c>
  </d>
  <e id="e_2"></e>
</a>
```

Once all remaining cursors have `.index === 0`, their `target`s are the set of
matching elements, in document order. This list is then deduplicated as a single
`target` element may match a single complex selector in many ways and may match
multiple complex selectors, which would result in multiple cursors.
