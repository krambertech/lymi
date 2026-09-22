import { CardForm } from "../../components/card-form";
import { DeckDetailView } from "../../views/deck-detail-view";
import { LibraryView } from "../../views/library-view";
import { Sidebar } from "../../views/shell";
import { WordView } from "../../views/word-view";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { SheetPreview } from "../sheet-preview";
import { PhoneShot, Shot } from "../shot";
import {
  deckCardsInSections,
  readyProgress,
  readySections,
  sectionProgress,
  sections,
  wordEvents,
  wordReviews,
} from "./library.mock";

export const screen: Screen = {
  order: 50,
  slug: "library",
  name: "Library",
  source: "views/library-view.tsx",
  note: "Library is every deck as a card: its name, whether it has cards due today, and its language and size. Decks without a series come first; each series follows under its own heading with its decks in order and one Review for all of them. A deck is two plates, today's and the deck's split, over its words as a glossary under Filter and Sort. A word opens with everything Lymi knows about it and its whole history: beside the list when both fit, otherwise as a side sheet on desktop and a drawer on a phone.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
        <PhoneShot caption="Library" initial="light" path="/library">
          <LibraryView decks={m.decks} next={{ d3: "Monday" }} static={{ path: "/library" }} />
        </PhoneShot>
        <PhoneShot caption="With a series" initial="dark" path="/library">
          <LibraryView
            decks={m.decksInSeries}
            series={m.series}
            onNewSeries={noop}
            onEditSeries={noop}
            onDeleteSeries={noop}
            static={{ path: "/library" }}
          />
        </PhoneShot>
        <PhoneShot caption="A deck" initial="dark" path="/library">
          <DeckDetailView
            deck={m.decks[0]}
            cards={m.deckCards}
            streak={m.streak}
            onAdd={noop}
            onArchive={noop}
            openCardId={null}
            static={{ path: "/library/d1" }}
          />
        </PhoneShot>
        <PhoneShot caption="A deck with sections" initial="light" path="/library">
          <DeckDetailView
            deck={m.decks[0]}
            cards={deckCardsInSections}
            streak={m.streak}
            onAdd={noop}
            onArchive={noop}
            openCardId={null}
            sections={sections}
            progress={sectionProgress}
            onStartSection={noop}
            static={{ path: "/library/d1" }}
          />
        </PhoneShot>
        <PhoneShot caption="A deck that is gone" initial="light" path="/library">
          <DeckDetailView
            deck={undefined}
            cards={undefined}
            onAdd={noop}
            onArchive={noop}
            failure="gone"
            static={{ path: "/library/gone" }}
          />
        </PhoneShot>
        <PhoneShot caption="A deck that would not load" initial="dark" path="/library">
          <DeckDetailView
            deck={undefined}
            cards={undefined}
            onAdd={noop}
            onArchive={noop}
            failure="unreachable"
            onRetry={noop}
            static={{ path: "/library/d1" }}
          />
        </PhoneShot>
        <PhoneShot caption="A card" initial="light" path="/library">
          <div className="px-5 pt-5">
            <WordView
              card={m.deckCards[2]?.card ?? m.queueItem.card}
              state={m.deckCards[2]?.state ?? null}
              deckName={m.decks[0]?.name ?? ""}
              reviews={wordReviews}
              events={wordEvents}
              onEdit={noop}
              onArchive={noop}
              onMove={noop}
              onClose={noop}
              decks={m.decks}
              hasNext
            />
          </div>
        </PhoneShot>
      </div>
      <Shot caption="Desktop, Library" initial="dark">
        {(t) => (
          <Desktop theme={t} height={620}>
            <Sidebar
              decks={m.decks}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              onAdd={noop}
              static={{ path: "/library" }}
            />
            <main className="@container flex min-w-0 flex-1 flex-col">
              <LibraryView decks={m.decks} next={{ d3: "Monday" }} static={{ path: "/library" }} />
            </main>
          </Desktop>
        )}
      </Shot>
      <Shot caption="Desktop, a deck whose next section is ready, as its owner" initial="dark">
        {(t) => (
          <Desktop theme={t} height={760}>
            <Sidebar
              decks={m.decks}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              onAdd={noop}
              static={{ path: "/library/d1" }}
            />
            <main className="@container flex min-w-0 flex-1 flex-col">
              <DeckDetailView
                deck={{ ...m.decks[0], due: 0 } as NonNullable<(typeof m.decks)[0]>}
                cards={deckCardsInSections}
                onAdd={noop}
                onArchive={noop}
                streak={m.streak}
                openCardId={null}
                sections={readySections}
                progress={readyProgress}
                onStartSection={noop}
                sectionActions={{
                  onCreate: noop,
                  onRename: noop,
                  onAddCard: noop,
                  onManage: noop,
                  onPickSection: noop,
                  onMoveCards: noop,
                }}
                static={{ path: "/library/d1" }}
              />
            </main>
          </Desktop>
        )}
      </Shot>
      <Shot caption="Desktop, a deck with a card open beside it" initial="light">
        {(t) => (
          <Desktop theme={t} height={760}>
            <Sidebar
              decks={m.decks}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              onAdd={noop}
              static={{ path: "/library/d1" }}
            />
            <main className="@container flex min-w-0 flex-1 flex-col">
              <DeckDetailView
                deck={m.decks[0]}
                cards={m.deckCards}
                onAdd={noop}
                onArchive={noop}
                streak={m.streak}
                openCardId="c6"
                reviews={wordReviews}
                events={wordEvents}
                onEditCard={noop}
                decks={m.decks}
                cardBeside
                static={{ path: "/library/d1" }}
              />
            </main>
          </Desktop>
        )}
      </Shot>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="Add a card" initial="dark" path="/library" bare>
          <div className="flex flex-1 flex-col justify-end bg-scrim">
            <SheetPreview shape="drawer" title="Add a card">
              <CardForm
                mode="add"
                layout="chips"
                decks={m.decks}
                deckId="d1"
                onCancel={noop}
                onSubmit={() => undefined}
                static
              />
            </SheetPreview>
          </div>
        </PhoneShot>
      </div>
    </div>
  ),
};
