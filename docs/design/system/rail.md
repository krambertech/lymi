# The rail

The rail is the desktop navigation. `Sidebar` in `views/shell.tsx` uses `RailNav`, `RailRow` and `RailHeading` from `components/rail-nav.tsx`. The design sidebar uses the same components. [layout.md](layout.md#desktop-the-rail) defines its placement.

## Anatomy

Top to bottom:

1. The first line: the app tile and wordmark, the streak pill, and capture. It sits 32 px down, level with the page title beside it.
2. The main screens: Today, Library, Insights and Explore, each with an icon.
3. **Decks**, for the decks that belong to no series.
4. One section per series, in Library's order, headed by the series' name.
5. The offer to connect an AI assistant, while none is connected.
6. The learner, under a rule across the rail.

The header, assistant offer and learner row stay fixed while the navigation and deck list scroll. Capture and the learner menu remain accessible in a long list.

```tsx
<RailNav rows={groups}>
  <RailRow render={<NavLink to="/today" exact />} icon={<Sun aria-hidden="true" />}>
    {t`Today`}
  </RailRow>
  <RailHeading>{t`Decks`}</RailHeading>
  <RailRow render={<NavLink to="/library/$deckId" params={{ deckId }} />} end={<DueCount>{due}</DueCount>}>
    {name}
  </RailRow>
</RailNav>
```

## Rows

A row is `RailRow`, rendered as the router's link: 40 px tall, `text-base` in `text-2`, an 18 px icon in `muted`, and a 10 px radius. A deck row has no icon and ends in its `DueCount` while cards are due, and nothing when none are. A long name truncates; it never wraps. On the design pages a row is 36 px from a tablet up, because a list of documentation pages is denser than a learner's decks.

## Sections and series

`RailHeading` uses 12 px tracked capitals in `muted`, with 28 px above it. It is a label, not an `h2`, so it does not alter the content screen’s heading outline. Series headings use the same style as Decks. Show Decks only when ungrouped decks exist, and omit series with no decks.

Series headings do not navigate or collapse. Keep their deck rows unindented. A series has no dedicated page.

## States

| State | Row | Light theme | Dark theme |
| --- | --- | --- | --- |
| Rest | no fill, `text-2` | | |
| Hover | the `RailNav` fill, `text` | `rail-hover`, the same as `hover` | a 4% white wash |
| Current | `bg-rail-chosen edge-inset`, `text` | white with a hairline, as a plate | a flat step above the rail with a hairline inside, never lifted |
| Focus | the neutral 2 px `ring` outline | | |

Selection must remain more prominent than hover. Use `bg-rail-chosen edge-inset` rather than `edge` or `bg-plate`: those panel treatments add unwanted elevation or weaker contrast in dark theme. Learner and streak controls hover with `rail-hover`. While the learner menu is open, its row uses the selected treatment.

## Hover

`RailNav` lays one fill under all its rows, which moves as every list hover does ([motion.md](motion.md#hover)): it slides across the 2 px between rows, fades in at the next row past a heading, and goes at a key press. The current row's opaque fill hides it as it passes under.

## The learner

The learner row is `LearnerMenu` with `variant="rail"`: 56 px, a 34 px avatar and the learner's first name, opening upward. It sits under a rule that runs the rail's full width, never a border on the row, because a top border on a rounded row curves at its corners.

## The offer to connect an assistant

`AssistantOffer` appears above the learner divider once connected apps have loaded and the list is empty. It shows Claude, ChatGPT, Gemini and Grok marks, each linking to its Settings page. The title, arrow and description link to the Apps group. Keep the panel compact and omit an additional button. Hover spreads the overlapping marks horizontally and moves the arrow slightly; reduced motion keeps them still. The `xs` dismiss button is at the end of the marks row, visible on hover or focus and always visible on touch. Dismissal is device-local. `AssistantMenuItem` remains in the learner menu, beside Docs and Send feedback, until an app connects.
