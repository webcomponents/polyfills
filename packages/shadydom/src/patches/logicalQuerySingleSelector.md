`logicalQuerySingleSelector` emulates `querySelectorAll` for a single complex
selector within Shady DOM's logical tree by implementing the tree-traversal
portion of a selector engine. It does so by (a) finding all elements in the root
that match the final compound selector to create the initial set of 'cursors';
(b) iterating backwards through the combinators and remaining compound
selectors, checking if the candidates implied by each combinator for each
cursor's `position` element would match the compound selector preceding them and
updating the cursors accordingly; and (c) deduplicating the set of `target`
elements of all remaining cursors and filtering out any that aren't exclusive
descendants of the context element.

For example, consider querying for `a > b ~ c` within this tree:

```html
<a>
  <b></b>
  <x></x>
  <c id="c_1"></c>
  <d>
    <x></x>
    <b></b>
    <c id="c_2"></c>
  </d>
</a>
```

First, all elements in the root are tested against the final compound selector
(`c`) to create the initial set of cursors:

```html
<a>
  <b></b>
  <x></x>
  <c id="c_1"></c>
  <!-- cursor 1: target=#c_1 -->
  <d>
    <x></x>
    <b></b>
    <c id="c_2"></c>
    <!-- cursor 2: target=#c_2 -->
  </d>
</a>
```

Next, the combinators and the remaining compound selectors are iterated
backwards. Each combinator determines the set of candidate elements that must be
tested against the preceding compound selector.

Moving backwards, the next combinator and compound selector in `a > b ~ c` are
`~` and `b`, so the next set of candidate elements are the preceding siblings of
the current cursors' `position` elements:

```html
<a>
  <b></b>
  <!-- candidate for cursor 1 -->
  <x></x>
  <!-- candidate for cursor 1 -->
  <c id="c_1"></c>
  <!-- cursor 1: target=#c_1 -->
  <d>
    <x></x>
    <!-- candidate for cursor 2 -->
    <b></b>
    <!-- candidate for cursor 2 -->
    <c id="c_2"></c>
    <!-- cursor 2: target=#c_2 -->
  </d>
</a>
```

These candidates are filtered to those that match `b` and these matching
elements become the `position`s of the new set of cursors, with their `target`
set to the same `target` as the cursor for which they were previously a
candidate:

```html
<a>
  <b></b>
  <!-- cursor 3: target=#c_1 -->
  <x></x>
  <c id="c_1"></c>
  <d>
    <x></x>
    <b></b>
    <!-- cursor 4: target=#c_2 -->
    <c id="c_2"></c>
  </d>
</a>
```

The process repeats again for the next combinator and compound selector: `>` and
`a`. First, the combinator (`>`) determines the candidates:

```html
<a>
  <!-- candidate for cursor 3 -->
  <b></b>
  <!-- cursor 3: target=#c_1 -->
  <x></x>
  <c id="c_1"></c>
  <d>
    <!-- candidate for cursor 4 -->
    <x></x>
    <b></b>
    <!-- cursor 4: target=#c_2 -->
    <c id="c_2"></c>
  </d>
</a>
```

Then, the candidates are filtered by matching against the compound selector
(`a`), which determines the new cursors:

```html
<a>
  <!-- cursor 5: target=#c_1 -->
  <b></b>
  <x></x>
  <c id="c_1"></c>
  <d>
    <x></x>
    <b></b>
    <c id="c_2"></c>
  </d>
</a>
```

Once all combinators and compound selectors have been iterated, the remaining
cursors' `target` elements are known to match the given selector. These elements
are then deduplicated and filtered to remove any that are not exclusive
descendants of the context element.
