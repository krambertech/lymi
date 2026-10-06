# The rail

The rail is the desktop navigation: `Sidebar` in `views/shell.tsx`, built from `RailNav`, `RailRow` and `RailHeading` in `components/rail-nav.tsx`. The design pages' sidebar uses the same three, so the two rails cannot drift. Where the rail sits in the frame is in [layout.md](layout.md#desktop-the-rail); its tones are in [surfaces.md](surfaces.md#the-rails-rows).

## Anatomy

Top to bottom:

1. The first line: the app tile and wordmark, the streak pill, and capture. It sits 32 px down, level with the page title beside it.
2. The places: Today, Library, Insights and Explore, each with an icon.
3. **Decks**, for the decks that belong to no series.
4. One section per series, in Library's order, headed by the series' name.
5. The learner, under a rule across the rail.

The first line and the learner stay put; only the places between them scroll, so capture and the learner menu are in reach however many decks there are.

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

A section heading is `RailHeading`: 12 px tracked capitals in `muted`, 28 px above it. A series' name is a heading in exactly the same style as Decks, because a series is a sibling of Decks rather than something inside it. Decks heads only the decks without a series, and it is left out when there are none, so a learner whose every deck is in one series sees that series alone. A series with no decks has no section.

A series stays a heading over its decks in the rail. It is not a row, it does not fold, and its decks are not indented: each of those was tried on 6 Oct 2026 and read as either busy or bare. A series has no page yet.

## States

| State | Row | Light room | Dark room |
| --- | --- | --- | --- |
| Rest | no fill, `text-2` | | |
| Hover | the `RailNav` fill, `text` | `rail-hover`, the same as `hover` | a 4% white wash |
| Current | `bg-rail-chosen edge-inset`, `text` | white with a hairline, as a plate | a flat step above the rail with a hairline inside, never lifted |
| Focus | the neutral 2 px `ring` outline | | |

The current row is always the strongest row and hover always sits under it. Never `edge` or `bg-plate` on the current row: at night `edge` lifts it into a dark button and `plate` sits below `hover`. The learner row and the streak pill hover with `rail-hover` for the same reason, and the learner row takes the current row's look while its menu is open.

## Hover

`RailNav` lays one fill under all its rows. It slides to the row nearest the pointer over 150 ms, so it never blinks off in the 2 px between rows, and the current row's opaque fill hides it as it passes under. A heading divides the rows into groups: crossing one, the fill fades in at the new row instead of sliding across the heading. A key press removes it, because focus carries its own ring. Under reduced motion it fades in on the row under the pointer. [motion.md](motion.md#hover) has the timing.

## The learner

The learner row is `LearnerMenu` with `variant="rail"`: 56 px, a 34 px avatar and the learner's first name, opening upward. It sits under a rule that runs the rail's full width, never a border on the row, because a top border on a rounded row curves at its corners.
