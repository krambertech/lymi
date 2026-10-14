import { useLingui } from "@lingui/react/macro";
import { modeKey } from "@lymi/core";
import { useDecks, useSections } from "../data/queries";
import { SEARCHED_PAST, SearchField, useSearched } from "../ui/menu";
import { Text } from "../ui/primitives";
import { SheetGroup, SheetRow } from "../ui/sheet";
import { ChoicePage } from "./choice-page";
import { useChoices } from "./choices";
import { isTextMode, ModesChoices } from "./modes";
import { PictureChoices } from "./picture";

/** One of Add a word's choices, shown in place of the card. */
export type ChoiceKind = "deck" | "section" | "picture" | "modes";

interface PageProps {
  onBack: () => void;
}

/** The decks to add to, searched past fifteen as Select's are; a tap chooses one and goes back. */
function DeckPage({ onBack }: PageProps) {
  const { t } = useLingui();
  const { deckId, chooseDeck } = useChoices();
  const decks = useDecks().data ?? [];
  const current = decks.find((d) => d.id === deckId) ?? decks[0];
  const { query, setQuery, searching, shown } = useSearched(
    decks.map((d) => ({ value: d.id, label: d.name })),
  );
  const choose = (id: string) => {
    if (id !== current?.id) chooseDeck(id);
    onBack();
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
    <ChoicePage title={t`Deck`} lead={search || undefined} onBack={onBack}>
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
    </ChoicePage>
  );
}

/** The deck's sections; one is chosen with a tap, which goes back to the card. */
function SectionPage({ onBack }: PageProps) {
  const { t } = useLingui();
  const { deckId, sectionId, setSectionId } = useChoices();
  const decks = useDecks().data ?? [];
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const sections = useSections(deck?.id).data?.sections ?? [];
  const choose = (id: string | null) => {
    setSectionId(id);
    onBack();
  };
  return (
    <ChoicePage title={t`Section`} onBack={onBack}>
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
    </ChoicePage>
  );
}

/** How the card is asked; several can be ticked, so the page stays until back. */
function ModesPage({ onBack }: PageProps) {
  const { t } = useLingui();
  const { deckId, modes, setModes } = useChoices();
  const decks = useDecks().data ?? [];
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const deckModes = (deck?.reviewModes ?? []).map(modeKey).filter(isTextMode);
  return (
    <ChoicePage title={t`How it’s asked`} onBack={onBack}>
      <ModesChoices value={modes} deckModes={deckModes} onChange={setModes} />
    </ChoicePage>
  );
}

/** The card's picture, taken or chosen and described, on a page with room for it. */
function PicturePage({ onBack }: PageProps) {
  const { t } = useLingui();
  const { picture, setPicture } = useChoices();
  return (
    <ChoicePage title={t`Picture`} onBack={onBack}>
      <PictureChoices value={picture} onChange={setPicture} />
    </ChoicePage>
  );
}

/** Each choice's page, by the chip that opens it. */
export const CHOICE_PAGES: Record<ChoiceKind, (props: PageProps) => React.JSX.Element> = {
  deck: DeckPage,
  section: SectionPage,
  picture: PicturePage,
  modes: ModesPage,
};
