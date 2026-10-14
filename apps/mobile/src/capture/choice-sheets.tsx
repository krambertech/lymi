import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { modeKey } from "@lymi/core";
import { useDecks, useSections } from "../data/queries";
import { SEARCHED_PAST, SearchField, useSearched } from "../ui/menu";
import { Text } from "../ui/primitives";
import { SheetGroup, SheetRow } from "../ui/sheet";
import { useChoices } from "./choices";
import { isTextMode, ModesChoices } from "./modes";
import { PictureChoices } from "./picture";

/** One of Add a word's choices, each opened from its chip as a sheet over the card. */
export type ChoiceKind = "deck" | "section" | "picture" | "modes";

/** Each choice's name, the title of its sheet. */
export const CHOICE_TITLES: Record<ChoiceKind, MessageDescriptor> = {
  deck: msg`Deck`,
  section: msg`Section`,
  picture: msg`Picture`,
  modes: msg`How it’s asked`,
};

interface ChoiceProps {
  /** Once one of a list is chosen, which closes the sheet. */
  onChosen?: () => void;
}

/** The decks to add to, searched past fifteen as Select's are; a tap chooses one and closes the sheet. */
function DeckChoice({ onChosen }: ChoiceProps) {
  const { t } = useLingui();
  const { deckId, chooseDeck } = useChoices();
  const decks = (useDecks().data ?? []).filter((d) => d.role === "owner");
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

/** How the card is asked; several can be ticked, so the sheet stays until it is swiped away. */
function ModesChoice() {
  const { deckId, modes, setModes } = useChoices();
  const decks = useDecks().data ?? [];
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const deckModes = (deck?.reviewModes ?? []).map(modeKey).filter(isTextMode);
  return <ModesChoices value={modes} deckModes={deckModes} onChange={setModes} />;
}

/** The card's picture, taken or chosen and described. */
function PictureChoice() {
  const { picture, setPicture } = useChoices();
  return <PictureChoices value={picture} onChange={setPicture} />;
}

/** What each choice's sheet holds, by the chip that opens it. */
export const CHOICES: Record<ChoiceKind, (props: ChoiceProps) => React.JSX.Element> = {
  deck: DeckChoice,
  section: SectionChoice,
  picture: PictureChoice,
  modes: ModesChoice,
};
