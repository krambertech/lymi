import { ExploreView } from "../../views/explore-view";
import { Sidebar } from "../../views/shell";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot, Shot } from "../shot";
import { catalogue, catalogueAdded } from "./explore.mock";

export const screen: Screen = {
  order: 100,
  slug: "explore",
  name: "Explore",
  source: "views/explore-view.tsx",
  note: "Every deck Lymi publishes, inside the app. A shelf per category, wrapping into as many rows as its decks need, so every deck is on the page. A deck is one of its own cards in a tray, in a hue hashed from its slug alone — eight of them, so two side by side is the price of a colour that never moves as the catalogue grows. The tray sits inside a card here, unlike the public page, because the Add on it has to belong to something; Add is secondary, because a shelf of decks has no single thing to press. A deck already in Library says so and leads there.",
  Demo: () => (
    <div className="grid gap-10">
      <Shot caption="Desktop, Explore" initial="light">
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
              <ExploreView
                data={{ decks: catalogue, added: catalogueAdded }}
                onAdd={noop}
                st={{ path: "/explore" }}
              />
            </main>
          </Desktop>
        )}
      </Shot>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="On the phone" initial="dark" path="/explore">
          <ExploreView
            data={{ decks: catalogue, added: catalogueAdded }}
            onAdd={noop}
            st={{ path: "/explore" }}
          />
        </PhoneShot>
        <PhoneShot caption="Before the first deck is published" initial="light" path="/explore">
          <ExploreView data={{ decks: [], added: {} }} onAdd={noop} st={{ path: "/explore" }} />
        </PhoneShot>
      </div>
    </div>
  ),
};
