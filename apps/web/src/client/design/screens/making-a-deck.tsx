import { NewDeckForm } from "../../components/new-deck-sheet";
import { DeckSettingsView } from "../../views/deck-settings-view";
import { LibraryView } from "../../views/library-view";
import { Sidebar } from "../../views/shell";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { SheetPreview } from "../sheet-preview";
import { PhoneShot, Shot } from "../shot";

export const screen: Screen = {
  order: 60,
  slug: "making-a-deck",
  name: "Making a deck",
  source: "views/deck-settings-view.tsx",
  note: "A deck is a name and two settings, so creating one is a sheet rather than a wizard: the name is the field that matters and the rest already has an answer. The sheet takes the shape of the machine it is on: a drawer under the thumb on the phone, a centred modal on a desktop, same form inside both. Everything chosen there can be changed afterwards on the deck's own settings screen, which is a screen and not a sheet because the back gesture should work and the direction choice needs room to say what it does. Nothing there has a Save button.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="New deck" initial="light" path="/library" bare>
          <div className="flex flex-1 flex-col justify-end bg-scrim">
            <SheetPreview shape="drawer" title="New deck">
              <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
            </SheetPreview>
          </div>
        </PhoneShot>
        <PhoneShot caption="Deck settings" initial="dark" path="/library">
          <DeckSettingsView
            deck={m.decks[2]}
            example={{
              term: "затишок",
              meaning: "a cosy, sheltered spot",
            }}
            onSave={noop}
            saved
          />
        </PhoneShot>
      </div>
      <Shot caption="Desktop, the same sheet as a modal" initial="light">
        {(t) => (
          <Desktop theme={t} height={560}>
            <Sidebar
              decks={m.decks}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              onAdd={noop}
              static={{ path: "/library" }}
            />
            <main className="@container relative flex min-w-0 flex-1 flex-col">
              <LibraryView decks={m.decks} static={{ path: "/library" }} />
              <div className="absolute inset-0 grid place-items-center bg-scrim">
                <SheetPreview shape="dialog" title="New deck" className="w-[min(92%,440px)]">
                  <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                </SheetPreview>
              </div>
            </main>
          </Desktop>
        )}
      </Shot>
      <Shot caption="Desktop, deck settings" initial="light">
        {(t) => (
          <Desktop theme={t} height={720}>
            <Sidebar
              decks={m.decks}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              onAdd={noop}
              static={{ path: "/library/d3" }}
            />
            <main className="@container flex min-w-0 flex-1 flex-col">
              <DeckSettingsView
                deck={m.decks[2]}
                example={{
                  term: "затишок",
                  meaning: "a cosy, sheltered spot",
                }}
                onSave={noop}
                onArchive={noop}
              />
            </main>
          </Desktop>
        )}
      </Shot>
    </div>
  ),
};
