import { ExploreDeckView } from "../../views/explore-deck-view";
import { Sidebar } from "../../views/shell";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot, Shot } from "../shot";
import { publicDeck } from "./explore-deck.mock";

export const screen: Screen = {
  order: 110,
  slug: "explore-deck",
  name: "A published deck",
  source: "views/explore-deck-view.tsx",
  note: "One published deck without leaving the app. The deck's colour is the ground of the whole header, back included, from the rail to the window's edge. Add is white on it because amber on a coloured ground stops reading as the thing to press. A hand of up to three cards sits beside the name on desktop and above it on a phone; adding gathers it into one stack under a check and keeps the learner on the page. Sections say what opens first; every card is one disclosure away, since the full list is what a learner checks before committing.",
  Demo: () => (
    <div className="grid gap-10">
      <Shot caption="Desktop, a deck the learner has not added" initial="light">
        {(t) => (
          <Desktop theme={t} height={760}>
            <Sidebar
              decks={m.decks}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              onAdd={noop}
              static={{ path: "/explore" }}
            />
            <main className="@container flex min-w-0 flex-1 flex-col">
              <ExploreDeckView
                data={{ deck: publicDeck, deckId: null }}
                onAdd={noop}
                st={{ path: "/explore" }}
              />
            </main>
          </Desktop>
        )}
      </Shot>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="Already in the library" initial="dark" path="/explore">
          <ExploreDeckView
            data={{ deck: publicDeck, deckId: "d2" }}
            onAdd={noop}
            st={{ path: "/explore" }}
          />
        </PhoneShot>
        <PhoneShot caption="Withdrawn since the link was shared" initial="light" path="/explore">
          <ExploreDeckView data={undefined} missing onAdd={noop} st={{ path: "/explore" }} />
        </PhoneShot>
      </div>
    </div>
  ),
};
