---
name: view-transitions
description: |
  Animate between screens and UI states with the browser's View Transitions API in Lymi's TanStack Router app. Use when adding or fixing page transitions, directional forward/back navigation, shared element morphs (a card in a list becoming the card on its own screen), list reorder animation, or the reveal when data lands. Also use when someone mentions view transitions, `startViewTransition`, `view-transition-name`, transition types, or asks why a navigation animates wrong, animates twice, or does not animate at all. For gestures, springs, drags, and the lantern, reach for Motion instead.
---

# View transitions in Lymi

The browser snapshots the old screen, runs your callback, snapshots the new one, and animates between them. TanStack Router does the calling: set `defaultViewTransition` on `createRouter` in [`main.tsx`](../../../apps/web/src/client/main.tsx) and every navigation goes through `document.startViewTransition`. Nothing is set today, so nothing animates yet.

React's `<ViewTransition>` component is **not** part of this. It lives in the React canary channel; Lymi is on React 19 stable and stays there. Everything here is the native API plus router config plus CSS.

## Which tool

| The motion is | Use |
|---|---|
| A route change, or one screen becoming another | View transitions |
| A shared element morphing across a navigation | View transitions |
| A drag, a swipe, a spring, a gesture | Motion (`motion/react`) |
| The lantern | Motion |
| A bottom sheet | Vaul, which owns its own animation |

View transitions animate *between two committed states*. Anything the finger is still touching needs a spring, not a snapshot.

## When to animate

Every transition communicates a spatial relationship. If you cannot say in one sentence what it tells the learner, don't add it.

```
Does the navigation go deeper or come back? (list → card, home → deck)
├── Yes → directional slide, nav-forward / nav-back
└── No
    ├── Sibling screens on the tab bar? → cross-fade, or nothing
    ├── The same thing appearing bigger on the next screen? → shared element morph
    └── A background refetch or revalidation? → no transition at all
```

Directional slides are for hierarchy and for ordered sequences (previous card, next card). A slide between two tabs claims a depth that isn't there, and it reads as a bug.

## Typed transitions

A bare `defaultViewTransition: true` gives every navigation the same cross-fade. Pass an object instead and derive the type from the route change — one place, every navigation, including the phone's back gesture:

```ts
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultViewTransition: {
    types: ({ fromLocation, toLocation, pathChanged }) => {
      if (!pathChanged) return false;                        // a search-param change is not a navigation
      const depth = (l?: { pathname: string }) => l?.pathname.split("/").filter(Boolean).length ?? 0;
      return depth(toLocation) > depth(fromLocation) ? ["nav-forward"] : ["nav-back"];
    },
  },
});
```

Three things this buys, all of which the per-link alternative misses:

- **The back button and the swipe-back gesture get the right direction.** The router owns history, so it types those navigations too.
- **`false` skips the transition** for that navigation. Return it for revalidations and param-only changes.
- **It degrades on its own.** The router checks `CSS.supports("selector(:active-view-transition-type(a))")` first, and falls back to an untyped `document.startViewTransition(fn)` — a plain cross-fade — where types are unsupported. Firefox's first same-document implementation is exactly that case. Write the CSS so the untyped path still looks intentional.

Override per navigation where the rule is wrong:

```tsx
<Link to="/decks/$deckId" params={{ deckId }} viewTransition={{ types: ["nav-forward"] }}>
```

## Matching a type in CSS

Types land on the root element as `:active-view-transition-type()`, and the whole page is one snapshot named `root`:

```css
html:active-view-transition-type(nav-forward)::view-transition-old(root) { … }
html:active-view-transition-type(nav-forward)::view-transition-new(root) { … }
```

The comma-separated list inside the parentheses is an OR. The ready-made recipes — directional slides, morph, reveal, reduced motion — are in [`references/css-recipes.md`](references/css-recipes.md). Copy them into a new `styles/view-transitions.css` rather than writing your own; the timing, the blur through the middle of a morph, and the reduced-motion escape are all easy to get subtly wrong.

## Naming an element

`view-transition-name` pulls one element out of the page snapshot and animates it on its own. Two rules:

- **Unique while it is on screen.** Two live elements with one name breaks the transition outright, so template it: `view-transition-name: card-${id}`.
- **Only while it is transitioning.** A name held permanently promotes the element to its own layer forever, which costs paint on every frame.

`view-transition-class` groups names for styling — every card shares one animation without sharing a name. It is Baseline as of October 2025, so pair it with a plain `::view-transition-group(root)` rule for anything that must work on an older phone.

The nav bar, the header, and anything else that survives a navigation needs a name too — otherwise it slides with the page it happens to be painted in. See "persistent elements" in the recipes.

## The gotchas that cost an hour

- **Nothing animates.** The navigation did not go through the router (a raw `<a>`, `window.location`), or the types function returned `false`.
- **Everything animates, all the time.** A revalidation or a param change is being typed. Return `false` for `!pathChanged`.
- **The transition fires but the screen is blank.** The new route suspended inside the callback. Preload the data — `defaultPreload: "intent"` is already on — or let the old snapshot hold until the query resolves.
- **A duplicate-name error in the console.** Two elements carry the same `view-transition-name` at once, usually a list item and its detail counterpart both mounted for a frame.
- **A morph on text looks like a ghost.** Snapshots are rasters, so a small heading scaled to a large one smears. Use the `text-morph` recipe, which hides the old snapshot instead of scaling it.
- **Motion and a view transition on the same element.** They fight: the browser snapshots a transform mid-spring. Pick one per element.

## Adding transitions to a screen

Follow [`references/implementation.md`](references/implementation.md) in order. It starts with an audit of every navigation in the app, because the map of which navigations are forward, back, or lateral is the decision — the CSS afterwards is mechanical.
