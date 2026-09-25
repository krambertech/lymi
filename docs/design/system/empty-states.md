# Empty states

An empty state shows the learner how to fill what is empty, and it looks temporary, so it is never mistaken for content. The shape follows what is empty. The live versions are on the design system's Empty states page.

## Which empty state

```text
What is empty?
 ├── Still loading → Skeleton at the loaded size; never an empty state
 ├── It failed to load → ErrorState
 ├── Today, before the first review → StartGuide
 ├── A whole screen with nothing in it yet (Library, a deck, Insights) → StartPanel
 │     └── and the layout is worth previewing (Insights) → also its real components with ghost
 ├── A group inside a screen (API keys, Connected apps) → EmptySection
 └── A search or filter with no match → NoResults
```

## StartGuide

`StartGuide` in `components/start-guide.tsx` is Today before the first review: one plate headed **Getting started**, with a count ("1 of 3 done") and a three-part track, then three steps in order: **Make a deck**, **Add cards from your last lesson**, **Review them**.

- Each step is done by the learner's own data, never by a dismissal.
- A done step shows a green check and a struck-through title, the current step holds its action, and a later step stays muted.
- Under the plate, a banner on a tray colour, **Start with a ready-made deck**, holds a card from each of up to three published decks the learner has not added and leads to Explore (`ReadyDecks`). It is gone once there is nothing left to add.
- After the first review the usual Today takes over, and the banner goes with the guide.

## StartPanel

`StartPanel` in `components/start-panel.tsx` serves Library with no decks, a deck with no cards, and Insights with no history. It is a 1.5 px dashed `edge-2` outline on the bare canvas, never a plate, because dashed is New's own mark for "not here yet". Inside sit a `text-lg` title, one sentence in `text-2`, one primary button at its normal size, and optionally a `StartPanelSection` under a dashed rule holding `NextSteps` rows for the other ways in.

```tsx
// Correct, from deck-detail-view.tsx
<StartPanel
  title={<Trans>No cards in {deck.name} yet</Trans>}
  body={<Trans>Add cards from your last lesson, then review them here.</Trans>}
  action={<Button variant="primary" className="justify-self-start" onClick={onAdd} kbd="N"><Trans>Add a card</Trans></Button>}
/>

// Incorrect: a plate reads as content, the lantern says nothing here, and "Nothing here" names nothing
<div className="edge rounded-xl bg-plate p-8 text-center">
  <Lantern />
  <p>Nothing here</p>
</div>
```

A start panel has one primary action. The other ways in are `NextSteps` rows: an outlined icon, a title, one line of detail and the arrow (`Go`), separated by a gap rather than rules so the hover fill never meets a line. Each row opens where the work happens, such as a Settings group by its anchor or the public docs. Connecting Claude or ChatGPT is offered only while no app is connected.

## Previews at zero

A screen whose layout is worth previewing shows its real components at zero. Insights draws its four `StatPlate`s with `ghost`, dashed and muted with their figures drawn empty, under its start panel. The preview uses the real component, so it moves when the layout does. Never draw a second picture of the same shape.

## EmptySection, NoResults and ErrorState

`EmptySection`, `NoResults` and `ErrorState` live in `components/empty-state.tsx`.

- `EmptySection` is an empty group inside a screen: an icon in a `plate-2` circle, a short title, one line of why, and the action that fills it.
- `NoResults` is one line under the controls that caused it. It names the query or the filter and offers Clear search or Show all.
- `ErrorState` is a screen that failed to load: centred, with the alert icon on `danger-soft`, never the lantern, because a calm lit lantern cannot say that something failed. The title says what failed, the line says the fix, and Try again retries.

```tsx
// Correct, from deck-detail-view.tsx
<NoResults
  title={query ? t`No cards match “${query}”` : t`No cards match these filters`}
  action={<Button size="sm" onClick={clearAll}>{query ? <Trans>Clear search</Trans> : <Trans>Show all</Trans>}</Button>}
/>
```

## Rules for all of them

- Every empty state is quieter than the page: its title is `text-xl` for the getting started guide, which is the whole of Today, and `text-lg` or smaller everywhere else. Its button is a normal button, never `size="xl"`.
- An empty state holds no examples or sample content. They crowd the action and can be mistaken for the learner's own data.
- The copy names what is missing and how to fill it: "No cards in Estonian A2 yet", not "Nothing here". It never promises what the product does not do yet, and never ties the lantern to anything but the streak.
- An empty screen may show the brand lantern, because an empty screen says nothing about the streak. An error never does.
