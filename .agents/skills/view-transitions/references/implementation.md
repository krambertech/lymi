# Adding view transitions, in order

Each step depends on the one before it. Step 1 is the one people skip and the one that decides whether the result feels designed or arbitrary.

## Step 1 — map the navigations

Before writing anything, list every way the learner moves through the app. Read the route files under `apps/web/src/client/routes/`, then grep for every `<Link`, `useNavigate`, and `router.navigate` in the client.

List the routes from the filenames under `apps/web/src/client/routes/` rather than from memory; the set changes. Leave out `design*`, which are reference surfaces rather than screens the learner navigates. Produce a table like this and show it to the user before touching code:

```
| From             | To                  | Relationship | Transition          |
|------------------|---------------------|--------------|---------------------|
| /library         | /library/$deckId    | deeper       | nav-forward + morph |
| /library/$deckId | /library            | back         | nav-back            |
| /today           | /library            | lateral      | cross-fade          |
| /review          | /review (next card) | sequential   | sequential slide    |
| any              | ?filter= change     | none         | no transition       |
```

Then note, per row: does a shared element exist on both sides? Does the route component unmount, or is it a param change on the same route?

## Step 2 — copy the CSS

Take the complete recipe set from [`css-recipes.md`](css-recipes.md) into `apps/web/src/client/styles/view-transitions.css`, imported from `styles.css` beside the other feature files. Copy all of it, including reduced motion, before tuning a single duration.

## Step 3 — type the router

Add `defaultViewTransition` to `createRouter` in [`app-entry.tsx`](../../../../apps/web/src/client/app-entry.tsx), using the types function from `SKILL.md`. Start there rather than with `true` — a bare `true` cross-fades every navigation identically, including revalidations, and it is harder to unpick later than to get right now. Depth comparison covers the common case; where the map from Step 1 disagrees with depth — two screens at the same depth where one is clearly deeper in the model — special-case that pair by pathname inside the function rather than by adding a prop to every link.

Verify each row of the table in the browser after this step, before adding a single shared element. Directional slides are most of the perceived quality, and they are the part that breaks quietly.

## Step 4 — persistent elements

Anything on screen before and after a navigation gets a `viewTransitionName` and the isolation CSS. Miss one and it slides with the page, which reads as the whole app moving instead of the content.

## Step 5 — shared elements

Only for pairs where the *same thing* appears on both screens: a deck row in Library and the deck header on its own screen.

```tsx
// In the list
<Link
  to="/library/$deckId"
  params={{ deckId: deck.id }}
  style={{ viewTransitionName: `deck-${deck.id}`, viewTransitionClass: "morph" }}
>

// On the deck screen — the same name
<header style={{ viewTransitionName: `deck-${deck.id}`, viewTransitionClass: "morph" }}>
```

Two rules that cause most of the bugs:

- The name must be unique among elements **currently on screen**. A list of 40 cards all named `card` breaks every transition.
- Carry the name only while the element can transition. If a component is rendered both in a route and inside a drawer, both mount at once and the pair breaks — make the name conditional on where it is used.

## Step 6 — reveals

Where a query resolves a skeleton into content, wrap the state change yourself:

```ts
if (document.startViewTransition) {
  document.startViewTransition(() => flushSync(() => setState(next)));
} else {
  setState(next);
}
```

React batches updates, so the callback needs `flushSync` for the DOM to be different by the time the browser takes the second snapshot. Guard the API — Firefox has it, older Safari does not, and the unguarded call throws.

## Step 7 — verify every row

Walk the table from Step 1 in a real browser, on a phone-width viewport, and check each:

- Does it animate at all, and in the direction the table says?
- Does the back gesture mirror the forward navigation?
- Do persistent elements hold still?
- Does a filter change or a background refetch animate anything? It should not.
- Does the console log a duplicate `view-transition-name`?
- With **Reduce motion** on in macOS or iOS settings, does everything cut instantly?

The phone check is the real one. A transition tuned on a 1280px window is usually twice as far and half as fast as it should be at 393px.

## Step 8 — check the fallback path

Open the app in Firefox. Types are absent from its first same-document implementation, so every navigation falls back to the untyped cross-fade in the recipes. Confirm that path still looks deliberate rather than broken — that is the experience for a real slice of browsers, and it is the reason the untyped `::view-transition-old(root)` rules exist at all.
