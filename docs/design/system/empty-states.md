# Empty states

An empty state names what is missing and offers the next useful action. Its styling distinguishes it from saved content. The design system’s Empty states page shows the available components.

## Which empty state

```text
What is empty?
 ├── Still loading → Skeleton at the loaded size; never an empty state
 ├── It failed to load → ErrorState
 ├── Today, before the first review → FirstRunGuide (web), StartGuide (phone)
 ├── A whole screen with nothing in it yet (Library, a deck, Insights) → StartPanel
 │     └── and the layout is worth previewing (Insights) → also its real components with ghost
 ├── A group inside a screen (API keys) → EmptySection
 └── A search or filter with no match → NoResults
```

## First-run guide

`FirstRunGuide` in `components/first-run.tsx` is Today until the first review: dashed on the bare canvas with the lantern's light at its start, a count ("1 of 3 done"), then three numbered steps. Each step is done by the learner's own data, never by a dismissal. [onboarding.md](../onboarding.md) owns the steps, what follows them, and the phone's `StartGuide` in `apps/mobile/src/welcome/start-guide.tsx`.

## StartPanel

`StartPanel` in `components/start-panel.tsx` is used for an empty Library, empty deck or Insights without history. Use a 1.5 px dashed `edge-strong` outline directly on the canvas. Include an outline icon in a `plate-nested` circle, a `text-lg` title, one `ink-secondary` sentence and a normal-sized primary action. Optional alternatives use `NextSteps` in `StartPanelSection` below a dashed divider. Library uses its navigation icon; a deck uses Layers.

```tsx
// Correct, from deck-detail-view.tsx
<StartPanel
  icon={<Layers />}
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

A start panel has one primary action. Alternatives use `NextSteps` rows with an outlined icon, title, description and `Go` arrow, separated by spacing. Link directly to the relevant Settings group or public guide. Where Smart add is available, lead with Turn your notes into cards for an empty deck; Today offers the same action as From your notes. Offer assistant connection only while no app is connected.

## Previews at zero

Use the real components for an empty-data layout preview. Insights shows its four `StatPlate`s below the start panel with `ghost`, dashed borders, muted styling and empty figures. Reusing the components keeps the preview consistent with the populated screen.

## EmptySection, NoResults and ErrorState

`EmptySection`, `NoResults` and `ErrorState` live in `components/empty-state.tsx`.

- `EmptySection` is an empty group inside a screen: an icon in a `plate-nested` circle, a short title, one line of why, and the action that fills it.
- `NoResults` replaces the list below its search or filter controls. Use a dashed `edge-strong` outline, a search or filter icon in a `plate-nested` circle, a title naming the query or filter, recovery text and Clear search or Show all.
- `ErrorState` represents a failed screen load. Centre an alert icon on `danger-soft`, name the failure, explain recovery and offer Try again. Use the error icon rather than the brand mark.

```tsx
// Correct, from deck-detail-view.tsx
<NoResults
  icon={query ? <SearchX /> : <ListFilter />}
  title={query ? t`No cards match “${query}”` : t`No cards match these filters`}
  detail={query ? <Trans>Search looks at the term and the meaning.</Trans> : <Trans>Remove a filter above, or show every card in this deck.</Trans>}
  action={<Button onClick={clearAll}>{query ? <Trans>Clear search</Trans> : <Trans>Show all</Trans>}</Button>}
/>
```

## Rules for all of them

- Every empty state is quieter than the page: its title is `text-xl` for the first-run guide, which heads Today, and `text-lg` or smaller everywhere else. Its button is a normal button, never `size="xl"`.
- An empty state holds no examples or sample content. They crowd the action and can be mistaken for the learner's own data.
- The copy names what is missing and how to fill it: "No cards in Estonian A2 yet", not "Nothing here". It never promises what the product does not do yet, and describes the empty content directly.
- An empty screen may show the brand lantern, because an empty screen says nothing about the streak. An error never does.
