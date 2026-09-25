# Components

Look here before building anything: if a component below does the job, use it, and if one nearly does, extend it rather than drawing a second. Paths are under `apps/web/src/client`. `pnpm check:design` fails when a design doc names a component nothing exports.

## Primitives: components/ui

`components/ui` holds shadcn components on Base UI, one file per primitive, added with `pnpm dlx shadcn@latest add <name>` from `apps/web`. The file is ours once added.

- Keep its export names, parts, data attributes and `render` composition; rewrite its classes to Lymi's tokens. Never add shadcn's colour variables: `muted` already names a text colour here, and two vocabularies would drift.
- The state variants generated classes use, such as `data-open:` and `data-horizontal:`, are copied from `shadcn/tailwind.css` into `styles.css`, because without them those classes match nothing and fail silently. Each matches Base UI's presence attributes, such as an empty `data-selected`, as well as Radix-style values.
- `pnpm dlx shadcn@latest add <name> --diff` shows what changed upstream, and an update is merged by hand.
- A primitive that changes shape by device keeps both shapes in its own file, behind shadcn's part names, and tests every part in both.

The primitives: `Checkbox`, `Combobox`, `Dialog`, `Drawer`, `DropdownMenu`, `Field`, `Input`, `Popover`, `RadioGroup`, `Select`, `Separator`, `Slider`, `SlidingPlate`, `Switch`, `Textarea`, `Toast`, `ToggleGroup`, `Tooltip`. `Drawer` is the touch shape inside `Dialog`, `DropdownMenu` and `Select`; a call site uses those rather than `Drawer` directly. See [ADR 0017](../../adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md).

## Product components: components

Lymi-owned components compose the primitives. The ones every screen reaches for:

| Need | Component | File | Rules |
| --- | --- | --- | --- |
| An action | `Button`, `IconButton`, `buttonClass` | `button.tsx` | [buttons.md](buttons.md) |
| A screen | `Screen`, `PlaceBar`, `ShellChrome` | `layout/` | [layout.md](layout.md) |
| A way back, the top bar | `BackButton`, `TopBar` | `views/shell.tsx` | [layout.md](layout.md#back) |
| A form row and its controls | `Field` and the primitives | `ui/` | [forms.md](forms.md) |
| Two to four views | `Segmented` | `segmented.tsx` | [forms.md](forms.md#choice-controls) |
| A choice with a sentence each | `RadioCard` inside `RadioGroup` | `radio-card.tsx` | [forms.md](forms.md#choice-controls) |
| A group on a settings screen | `SettingsGroup` | `settings-group.tsx` | |
| A string to copy (an API key) | `CopyField` | `copy-field.tsx` | [type.md](type.md#monospace) |
| A label | `Chip`, `StateChip`, `SourceChip`, `DueCount`, `Kbd`, `StateIcon` | `chip.tsx` and others | [chips-and-marks.md](chips-and-marks.md) |
| Nothing to show yet | `StartGuide`, `StartPanel`, `EmptySection`, `NoResults`, `ErrorState`, `Skeleton` | `empty-state.tsx` and others | [empty-states.md](empty-states.md) |
| A row that goes somewhere | `NextSteps`, `NextStep`, `Go`, `NewCardsRow` | `next-steps.tsx` | [buttons.md](buttons.md#which-control) |
| A figure | `StatPlate` (with `ghost`), `Progress`, `SectionProgress`, `SectionRing`, `TrendLine`, `DayGrid`, `RunStrip` | | |
| A table | `Table`, `Th`, `Td` | `table.tsx` | |
| A person | `Avatar`, `AvatarEditor` | `avatar.tsx` | |
| The brand | `Lantern`, `Flame`, `Wordmark`, `Lockup`, `AppTile` | `lantern.tsx`, `flame.tsx`, `logo.tsx` | [brand.md](brand.md) |
| Another app's mark | `AppMark`, `GoogleMark`, `PublisherMark` | | [colour.md](colour.md#use-a-token-never-a-value) |

## Feature components

These belong to one feature and are listed so nothing is drawn twice.

- Cards: `CardForm`, `AddCardSheet`, `EditCardSheet`, `FieldChip`, `FieldChipRow`, `CardPictureField`, `CardPicture`, `CardNotes`, `CardStream`, `TagsInput`, `ReviewModesField`, `ReviewTimeline`, `RecallTally`, `GradeMark`.
- Decks: `DeckCard`, `NewDeckSheet`, `NewDeckForm`, `LanguageField`, `DirectionField`, `DirectionCompact`, `LibraryBoard`, `DeckTray`, `DeckTile`, `ReadyDecks`, `LeaveDeckDialog`.
- Sections and series: `SectionManager`, `SectionNameDialog`, `ArchiveSectionDialog`, `ArchivedSectionsDialog`, `MoveToSectionDialog`, `StartEarlyDialog`, `SeriesSheet`, `SeriesForm`, `DeleteSeriesDialog`, `MoveToSeriesDialog`.
- Sharing: `InviteDialog`, `RemoveMemberDialog`, `TurnOffLinkDialog`, `CancelInvitationDialog`.
- The streak: `StreakButton`, `StreakPanel`, `StreakPlace`, `StreakWeek`, `StreakCalendar`, `SevenLights`, `GoalPicker`, `RestDayBanner`.
- Navigation: `NavLink`, `PillNav`, `AddMenu`, `LearnerMenu`.
- Settings: `AccountSection`, `ApiKeysSection`, `ConnectedAppsSection`, `NotificationsSection`, `ExportSheet`, `ImportSources`.
- Auth: `AuthFrame`, `AuthNotice`, `PasswordField`, `Connection`, `PublicPolicyLinks`.
- Dialogs: `FeedbackDialog`, `InstallDialog`, `ShortcutsDialog`.
- Motion helpers: `FluidHighlight` (the sliding hover fill), `ErrorTip`.

## Views

`views/` holds the screens as prop-driven components, so the design page and the component tests can render them with sample data. A view takes data and callbacks as props and never fetches; its route does. Views lay out by container query ([layout.md](layout.md#container-queries)).
