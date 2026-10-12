import { View } from "react-native";
import { EmptyState } from "../../ui/empty-state";
import { Plate, SectionTitle } from "../../ui/primitives";
import { Sub, Variants } from "../frame";

const noop = () => {};

export function EmptyStates() {
  return (
    <>
      <Sub
        title="A whole empty page"
        note="Large and centred in the room the bars leave. Why it is empty picks the icon; a failure alone is red."
        source="ui/empty-state.tsx"
      >
        <Variants
          items={[
            {
              label: "start",
              note: "Nothing has been made yet. The one way to fill it is the primary button.",
              render: () => (
                <EmptyState
                  kind="start"
                  title="Nothing published yet"
                  body="Lymi is writing the first decks. Until then, make your own in Library."
                  action={{ label: "Open Library", onPress: noop }}
                />
              ),
            },
            {
              label: "noMatch",
              note: "A search or filter matched nothing. It names the query and offers the way back.",
              render: () => (
                <EmptyState
                  kind="noMatch"
                  title="No decks match “klingon”"
                  body="Try a word from a card, or a language."
                  action={{ label: "Clear search", onPress: noop }}
                />
              ),
            },
            {
              label: "failed",
              note: "The read failed: an alert on red, never the lantern.",
              render: () => (
                <EmptyState
                  kind="failed"
                  title="Couldn’t load Explore"
                  body="Check your connection and try again."
                  action={{ label: "Try again", onPress: noop }}
                />
              ),
            },
            {
              label: "offline",
              note: "It needs a connection. Being offline is no failure, so it carries no red.",
              render: () => (
                <EmptyState
                  kind="offline"
                  title="Explore needs a connection"
                  body="Your decks and reviews still work offline."
                  action={{ label: "Try again", onPress: noop }}
                />
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Inside a plate"
        note="The small size, when the empty group sits in a plate already on the screen. The plate is its surface; it never brings one of its own."
      >
        <Variants
          items={[
            {
              label: "inline · noMatch",
              render: () => (
                <View>
                  <SectionTitle>Cards</SectionTitle>
                  <Plate>
                    <EmptyState
                      size="inline"
                      kind="noMatch"
                      title="No cards match these filters"
                      action={{ label: "Show all", onPress: noop }}
                    />
                  </Plate>
                </View>
              ),
            },
            {
              label: "inline · failed",
              render: () => (
                <Plate>
                  <EmptyState
                    size="inline"
                    kind="failed"
                    title="Couldn’t load this card’s history"
                    action={{ label: "Try again", onPress: noop }}
                  />
                </Plate>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}
