import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { Flame } from "../../brand/flame";
import { usePalette } from "../../theme/palette";
import { inputCap } from "../../theme/type";
import { GlassButton, GlassPill } from "../../ui/glass";
import { Icon } from "../../ui/icons";
import { DropdownMenu, Select } from "../../ui/menu";
import { Button, IconButton, Text } from "../../ui/primitives";
import { Sheet, SheetGroup, SheetRow } from "../../ui/sheet";
import { Toast } from "../../ui/toast";
import { Row, Sub, Variants } from "../frame";

// How the phone's screens are put together and how they arrive. phone.md "How a screen arrives".

const MONO = { fontFamily: "Menlo", letterSpacing: 0 } as const;

const DECKS = [
  { value: "lezione", label: "Lezione 12" },
  { value: "verbi", label: "Verbi" },
  { value: "work", label: "Words from work" },
];

/** A rule set as a short list, for what a picture cannot show. */
function Rules({ items }: { items: [string, string][] }) {
  return (
    <View className="gap-3">
      {items.map(([name, rule]) => (
        <View key={name} className="gap-0.5">
          <Text className="text-sm font-medium text-text" style={MONO}>
            {name}
          </Text>
          <Text className="text-base text-text-2">{rule}</Text>
        </View>
      ))}
    </View>
  );
}

export function Pages() {
  const p = usePalette();
  return (
    <>
      <Sub
        title="Three ways in"
        note="How a screen arrives says how to leave it: from the side means back, from below means swipe down. This is overlays.md’s rule in iOS’s own navigation."
        source="docs/design/system/phone.md"
      >
        <Variants
          items={[
            {
              label: "Push, from the side",
              note: "A page to read or work in: a deck, a card, Insights, Settings. Leaves by the named back or a swipe from the start edge.",
              render: () => (
                <View className="gap-1">
                  <View className="h-11 flex-row items-center gap-1">
                    <Icon name="back" size={20} colour={p.text} />
                    <Text className="text-md font-medium text-text-2">Library</Text>
                  </View>
                  <Text className="text-3xl font-medium text-text">Lezione 12</Text>
                </View>
              ),
            },
            {
              label: "Sheet, from below",
              note: "A task with an end: Add a word, a menu, a choice list. Glass buttons float in its top corners; it leaves by a swipe down.",
              render: () => (
                <View className="flex-row items-center justify-between">
                  <GlassButton icon="close" label="Done" />
                  <GlassPill icon="deck">Verbi</GlassPill>
                  <GlassButton icon="plus" label="Add" primary />
                </View>
              ),
            },
            {
              label: "Cover, from below",
              note: "A mode that takes the screen: a review, Welcome. Leaves by X or by pulling the top bar down.",
              render: () => (
                <Row>
                  <IconButton icon="close" label="End review" />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="The top of a screen"
        note="A tab names itself in its bar, beside the streak and capture. A page puts the way back in its bar, named for where it goes, and its title large underneath: iOS’s own large-title pattern, so a learner already knows it."
        source="src/ui/screen.tsx"
      >
        <Variants
          items={[
            {
              label: "Tab",
              note: "Today, Library, You. No back: the tab bar is the way around.",
              render: () => (
                <View className="h-14 flex-row items-center justify-between">
                  <Text className="text-3xl font-medium text-text">Today</Text>
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-10 flex-row items-center gap-1.5 rounded-full bg-plate px-3.5">
                      <Flame height={18} />
                      <Text className="text-md font-medium text-text">5</Text>
                    </View>
                    <View className="size-10 items-center justify-center rounded-full bg-amber">
                      <Icon name="plus" size={20} colour={p["amber-ink"]} strokeWidth={2.25} />
                    </View>
                  </View>
                </View>
              ),
            },
            {
              label: "Page",
              note: "The back names its parent and goes there, whatever the history holds. The large title is the page’s heading for VoiceOver.",
              render: () => (
                <View className="gap-1">
                  <View className="h-11 flex-row items-center gap-1">
                    <Icon name="back" size={20} colour={p.text} />
                    <Text className="text-md font-medium text-text-2">Design system</Text>
                  </View>
                  <Text className="text-3xl font-medium text-text">Sheets</Text>
                </View>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Spacing and edges"
        note="What stays the same on every screen, so a page needs no layout decisions of its own."
      >
        <Rules
          items={[
            ["20 pt", "From the screen’s side edges to the content, on every screen."],
            ["28 pt", "Between sections of a page. A section’s title sits 12 pt over its plate."],
            ["44 pt", "The smallest thing a finger presses, whatever it looks like."],
            [
              "Concentric",
              "Something that sits near a rounded edge, a sheet’s or the screen’s, takes a corner that follows it: its radius is the edge’s less the space between them.",
            ],
            [
              "Under the thumb",
              "A screen’s one action sits low, where the thumb is; what it acts on sits above.",
            ],
          ]}
        />
      </Sub>
    </>
  );
}

export function Sheets() {
  const router = useRouter();
  const p = usePalette();
  const [menuLast, setMenuLast] = useState("nothing yet");
  const [deck, setDeck] = useState("lezione");
  const [streakOpen, setStreakOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deckTitle, setDeckTitle] = useState("Verbi");
  const [draft, setDraft] = useState(deckTitle);
  const deckName = DECKS.find((d) => d.value === deck)?.label ?? "";
  const keep = () => {
    setDeckTitle(draft.trim() || deckTitle);
    setRenaming(false);
  };
  return (
    <>
      <Sub
        title="Which sheet"
        note="What the task holds decides the kind, and the kind decides its glass. Glass wherever the task is quick; opaque where the learner reads or types at length."
        source="docs/design/system/phone.md"
      >
        <Variants
          items={[
            {
              label: "Row sheet, glass",
              note: "A choice or a one-field edit over the screen: a menu, a Select, a deck’s name. Rename the deck below; done or a swipe keeps what was typed.",
              render: () => (
                <Row>
                  <Button
                    label={`Rename “${deckTitle}”`}
                    variant="secondary"
                    onPress={() => {
                      setDraft(deckTitle);
                      setRenaming(true);
                    }}
                  />
                  <Sheet title="Name" open={renaming} onOpenChange={(open) => !open && keep()}>
                    <View className="rounded-xl bg-glass-plate px-4">
                      <TextInput
                        value={draft}
                        onChangeText={setDraft}
                        autoFocus
                        onSubmitEditing={keep}
                        accessibilityLabel="Name"
                        returnKeyType="done"
                        selectionColor={p.text}
                        className="min-h-11 py-2 font-sans text-text"
                        style={{ fontSize: 17 }}
                        maxFontSizeMultiplier={inputCap(17)}
                      />
                    </View>
                  </Sheet>
                </Row>
              ),
            },
            {
              label: "Short form, glass",
              note: "Fits on one screen and is done in seconds: Add a word, Edit card, New deck, New series. Opens the real New deck.",
              render: () => (
                <Row>
                  <Button
                    label="Open New deck"
                    variant="secondary"
                    onPress={() => router.push("/new-deck")}
                  />
                </Row>
              ),
            },
            {
              label: "Long form, opaque",
              note: "Scrolls or holds long text: feedback, Choose decks. Opens the real Send feedback.",
              render: () => (
                <Row>
                  <Button
                    label="Open Send feedback"
                    variant="secondary"
                    onPress={() => router.push("/you/feedback")}
                  />
                </Row>
              ),
            },
          ]}
        />
        <Rules
          items={[
            [
              "With glass off",
              "Under Reduce Transparency or before iOS 26, every glass sheet is the opaque sheet colour and its groups take the room’s fills. Turn on Settings › Accessibility › Display › Reduce Transparency to see these three that way.",
            ],
            [
              "A form",
              "Labelled lines with no box, the one action amber at the end of the header. Close or a swipe leaves without saving; once something is typed, a swipe asks first.",
            ],
            [
              "Choices",
              "One of a list runs once the sheet has gone. Several of a list save with each tap and the sheet stays open.",
            ],
          ]}
        />
      </Sub>
      <Sub
        title="What a sheet is"
        note="iOS presents every sheet, so it is Liquid Glass, follows the finger and swipes away; what is inside is Lymi’s. Before iOS 26 the same sheet is opaque."
        source="src/ui/sheet.tsx"
      >
        <Rules
          items={[
            [
              "Sized to what it holds",
              "A sheet opens at the height of its rows. One with more to show drags up to the full screen, where iOS turns the glass opaque so what is under it stops showing through.",
            ],
            [
              "Groups on plates",
              "Rows that belong together share one plate, inset 16 pt from the sheet’s edge and 12 pt from the next group. A hairline between rows runs the plate’s full width, as on every plate.",
            ],
            [
              "Rows",
              "52 pt, a Lucide icon in the slot every row keeps, the label in Onest. A row that removes something is red, icon included. A chosen row leads with a check; a row that opens more ends in a chevron.",
            ],
            [
              "Title",
              "Says what the sheet is about, a field’s name or a card’s term, in line with the rows’ text.",
            ],
            [
              "A choice runs once the sheet has gone",
              "So nothing moves under a sheet that is still leaving. A sheet over a form gives the cursor back to the field it came from.",
            ],
          ]}
        />
      </Sub>
      <Sub
        title="Menu"
        note="A list of actions from a button, most used first. A removal sits last, in a red group of its own. The same thing has the same rows wherever its menu opens."
        source="src/ui/menu.tsx"
      >
        <Variants
          items={[
            {
              label: "From an icon button",
              note: `Tap it. Last chosen: ${menuLast}.`,
              render: () => (
                <Row>
                  <DropdownMenu
                    title="hämarik"
                    trigger={(open) => (
                      <IconButton
                        icon="more"
                        label="Card options"
                        variant="secondary"
                        onPress={open}
                      />
                    )}
                    items={[
                      [
                        { label: "Edit card", icon: "edit", onSelect: () => setMenuLast("Edit") },
                        { label: "Move to…", icon: "move", onSelect: () => setMenuLast("Move") },
                      ],
                      [
                        {
                          label: "Archive card",
                          icon: "archive",
                          destructive: true,
                          onSelect: () => setMenuLast("Archive"),
                        },
                      ],
                    ]}
                  />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Choice"
        note="One of a list, titled with the field’s name. The chosen row leads with a check."
        source="src/ui/menu.tsx"
      >
        <Variants
          items={[
            {
              label: "From a glass pill",
              note: "As Add a word picks its deck.",
              render: () => (
                <Row>
                  <Select
                    label="Deck"
                    value={deck}
                    options={DECKS}
                    onChange={setDeck}
                    trigger={<GlassPill icon="deck">{deckName}</GlassPill>}
                  />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Drags up for more"
        note="A sheet that peeks with what matters and opens to the full screen for the rest, as the dev menu does. The streak is the first to use it."
        source="src/ui/sheet.tsx"
      >
        <Variants
          items={[
            {
              label: "Peek, then drag up",
              note: "Opens at the streak and its goal; drag the sheet up for the week and the actions.",
              render: () => (
                <Row>
                  <Button label="Open the streak" onPress={() => setStreakOpen(true)} />
                  <Sheet
                    title="5 days in a row"
                    open={streakOpen}
                    onOpenChange={setStreakOpen}
                    more={
                      <>
                        <SheetGroup>
                          <SheetRow label="Monday" detail="50 reviews" onPress={() => undefined} />
                          <SheetRow
                            label="Tuesday"
                            detail="12 reviews, a rest day"
                            onPress={() => undefined}
                          />
                          <SheetRow
                            label="Wednesday"
                            detail="50 reviews"
                            onPress={() => undefined}
                          />
                        </SheetGroup>
                        <SheetGroup>
                          <SheetRow
                            label="Reminders"
                            icon="email"
                            opens
                            onPress={() => undefined}
                          />
                        </SheetGroup>
                      </>
                    }
                  >
                    <SheetGroup>
                      <SheetRow
                        label="Daily goal"
                        icon="check"
                        detail="50 reviews a day"
                        opens
                        onPress={() => undefined}
                      />
                      <SheetRow
                        label="Today"
                        icon="today"
                        detail="47 reviews to go"
                        onPress={() => undefined}
                      />
                    </SheetGroup>
                  </Sheet>
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Glass corners"
        note="A sheet’s own controls float on it as glass, 44 pt: close at the start, the sheet’s one action at the end in amber, and between them a pill for what the sheet works in."
        source="src/ui/glass.tsx"
      >
        <Variants
          items={[
            {
              label: "Add a word’s top",
              render: () => (
                <View className="flex-row items-center justify-between">
                  <GlassButton icon="close" label="Done" />
                  <GlassPill icon="deck">Verbi</GlassPill>
                  <GlassButton icon="plus" label="Add" primary />
                </View>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

/** The toast as the learner meets it: it rises over the screen for ten seconds, then goes. */
function LiveToast({ title, onUndo }: { title: string | null; onUndo: () => void }) {
  if (!title) return null;
  return <Toast title={title} action={{ label: "Undo", onPress: onUndo }} />;
}

export function AfterAction() {
  const [shown, setShown] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const gone = setTimeout(() => setShown(null), 10_000);
    return () => clearTimeout(gone);
  }, [shown]);
  return (
    <>
      <Sub
        title="Undo, not a question"
        note="What can be undone happens at once and offers Undo. A question comes only before what cannot be undone, as on the web."
        source="docs/design/system/phone.md"
      >
        <Rules
          items={[
            [
              "Acts at once, with Undo",
              "Archive a card or a deck, move a deck between series, restore from Archived.",
            ],
            [
              "Asks first",
              "Leave a shared deck, delete a series, sign out with work not yet sent. The safe button names what stays; the destructive one is last.",
            ],
          ]}
        />
      </Sub>
      <Sub
        title="Toast"
        note="Smoked glass above the tab bar, or above the grades in a review. One line, one action, ten seconds with an action and five without; a swipe sends it away."
        source="src/ui/toast.tsx"
      >
        <Variants
          items={[
            {
              label: "After an action",
              render: () => (
                <Toast
                  title="Moved “Verbi” to Italiano A2"
                  action={{ label: "Undo", onPress: () => undefined }}
                />
              ),
            },
            {
              label: "A failure",
              note: "Named for what failed, with an action that retries when retrying can help.",
              render: () => (
                <Toast
                  title="Couldn’t move “Verbi”."
                  error
                  action={{ label: "Try again", onPress: () => undefined }}
                />
              ),
            },
            {
              label: "Without an action",
              render: () => <Toast title="Saved on this phone" />,
            },
            {
              label: "Live",
              note: archived
                ? "“Verbi” is archived. Undo brings it back."
                : "Archive the deck; the toast stays ten seconds.",
              render: () => (
                <View className="gap-3">
                  <Row>
                    <Button
                      label={archived ? "Archived" : "Archive “Verbi”"}
                      variant="danger"
                      onPress={() => {
                        setArchived(true);
                        setShown("Archived “Verbi”");
                      }}
                    />
                  </Row>
                  <LiveToast
                    title={shown}
                    onUndo={() => {
                      setArchived(false);
                      setShown(null);
                    }}
                  />
                </View>
              ),
            },
          ]}
        />
      </Sub>
      <Sub title="A question" note="iOS’s own alert, kept for what cannot be undone.">
        <Variants
          items={[
            {
              label: "Leave a shared deck",
              render: () => (
                <Row>
                  <Button
                    label="Leave “Lezione 12”"
                    variant="secondary"
                    onPress={() =>
                      Alert.alert(
                        "Leave Lezione 12?",
                        "The deck leaves Library and its cards stop coming up in review. If you join again, your reviews are still there.",
                        [
                          { text: "Keep studying", style: "cancel" },
                          { text: "Leave deck", style: "destructive" },
                        ],
                      )
                    }
                  />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="In place"
        note="Where the screen itself is the answer, it changes there instead: Explore’s Add settles into In Library, an archived card’s page offers Restore, and Add a word keeps its line under the fields for the next card."
      />
      <Sub
        title="Offline"
        note="A write that queues says once that it is saved on this phone. A row that needs a connection is dimmed with Needs a connection as its detail, before it is tapped."
      >
        <Variants
          items={[
            {
              label: "Needs a connection",
              render: () => (
                <SheetGroup>
                  <SheetRow
                    label="Move to series"
                    icon="move"
                    detail="Needs a connection"
                    disabled
                    onPress={() => undefined}
                  />
                </SheetGroup>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}
