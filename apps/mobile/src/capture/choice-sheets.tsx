import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { modeKey } from "@lymi/core";
import { useDecks, useOwnedDecks, useSections } from "../data/queries";
import { SEARCHED_PAST, SearchField, useSearched } from "../ui/menu";
import { Text } from "../ui/primitives";
import { SheetGroup, SheetRow } from "../ui/sheet";
import { useDraft } from "./choice-sheet";
import { useChoices } from "./choices";
import { ModesChoices } from "./modes";
import { PictureChoices } from "./picture";
import { TagsChoices } from "./tags";

/** One of Add a word's choices, each opened from its chip as a sheet over the card. */
export type ChoiceKind = "deck" | "section" | "picture" | "modes" | "tags";

/** The choices ticked several at a time, whose sheets keep a draft that ✓ applies. */
export const DRAFTED: ReadonlySet<ChoiceKind> = new Set(["modes", "tags"]);

/** Each choice's name, the title of its sheet. */
export const CHOICE_TITLES: Record<ChoiceKind, MessageDescriptor> = {
  deck: msg`Deck`,
  section: msg`Section`,
  picture: msg`Picture`,
  modes: msg`How it’s asked`,
  tags: msg`Tags`,
};

interface ChoiceProps {
  /** Once one of a list is chosen, which closes the sheet. */
  onChosen?: () => void;
  /** The sheet's ✓ from inside it, such as the keyboard's done key: applies the draft and closes. */
  onDone: () => void;
  /** Lets a choice ticked several at a time hand its sheet's ✓ the draft to apply. */
  keep: (apply: () => void) => void;
  /** The card as typed so far, which the modes read and the picture's description must not name. */
  card: { term: string; meaning: string };
}

/** The decks to add to, searched past fifteen as Select's are; a tap chooses one and closes the sheet. */
function DeckChoice({ onChosen }: ChoiceProps) {
  const { t } = useLingui();
  const { deckId, chooseDeck } = useChoices();
  const decks = useOwnedDecks().data ?? [];
  const current = decks.find((d) => d.id === deckId) ?? decks[0];
  const { query, setQuery, searching, shown } = useSearched(
    decks.map((d) => ({ value: d.id, label: d.name })),
  );
  const choose = (id: string) => {
    if (id !== current?.id) chooseDeck(id);
    onChosen?.();
  };
  const search = decks.length > SEARCHED_PAST && (
    <SearchField
      label={t`Deck`}
      query={query}
      onChange={setQuery}
      onSubmit={() => shown[0] && choose(shown[0].value)}
      fill="group"
    />
  );
  return (
    <>
      {search}
      {shown.length > 0 ? (
        <SheetGroup>
          {shown.map((d, i) => (
            <SheetRow
              key={d.value}
              label={d.label}
              chosen={d.value === current?.id}
              active={searching && i === 0}
              onPress={() => choose(d.value)}
            />
          ))}
        </SheetGroup>
      ) : (
        <Text className="px-4 py-3 text-md text-muted">{t`No matches`}</Text>
      )}
    </>
  );
}

/** The deck's sections; one is chosen with a tap, which closes the sheet. */
function SectionChoice({ onChosen }: ChoiceProps) {
  const { t } = useLingui();
  const { deckId, sectionId, setSectionId } = useChoices();
  const decks = useDecks().data ?? [];
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const sections = useSections(deck?.id).data?.sections ?? [];
  const choose = (id: string | null) => {
    setSectionId(id);
    onChosen?.();
  };
  return (
    <SheetGroup>
      <SheetRow label={t`No section`} chosen={sectionId === null} onPress={() => choose(null)} />
      {sections.map((s) => (
        <SheetRow
          key={s.id}
          label={s.name}
          chosen={s.id === sectionId}
          onPress={() => choose(s.id)}
        />
      ))}
    </SheetGroup>
  );
}

/** How the card is asked; several can be ticked, and the sheet's ✓ keeps them. */
function ModesChoice({ card, keep }: ChoiceProps) {
  const { deckId, modes, setModes, picture } = useChoices();
  const [draft, setDraft] = useDraft(modes, setModes, keep);
  const decks = useDecks().data ?? [];
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  return (
    <ModesChoices
      value={draft}
      deckModes={(deck?.reviewModes ?? []).map(modeKey)}
      onChange={setDraft}
      term={card.term}
      meaning={card.meaning}
      picture={!picture ? "none" : picture.description.trim() ? "described" : "undescribed"}
    />
  );
}

/** The card's picture, taken or chosen and described. */
function PictureChoice({ card }: ChoiceProps) {
  const { picture, setPicture } = useChoices();
  return <PictureChoices value={picture} onChange={setPicture} card={card} />;
}

/** The card's tags, which stay for the next card; the sheet's ✓ keeps what is ticked. */
function TagsChoice({ onDone, keep }: ChoiceProps) {
  const { deckId, tags, setTags } = useChoices();
  const decks = useDecks().data ?? [];
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  return (
    <TagsChoices value={tags} onChange={setTags} deckId={deck?.id} onDone={onDone} keep={keep} />
  );
}

/** What each choice's sheet holds, by the chip that opens it. */
export const CHOICES: Record<ChoiceKind, (props: ChoiceProps) => React.JSX.Element> = {
  deck: DeckChoice,
  section: SectionChoice,
  picture: PictureChoice,
  modes: ModesChoice,
  tags: TagsChoice,
};
