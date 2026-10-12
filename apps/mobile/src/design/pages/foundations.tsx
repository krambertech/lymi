import { CHOICE_SLIDE, endEmbers } from "@lymi/design";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { type ReactNode, useState } from "react";
import { View, type ViewStyle } from "react-native";
import { playHaptics } from "../../../modules/lymi-haptics";
import { endHaptics } from "../../review/end-haptics";
import { type Palette, usePalette } from "../../theme/palette";
import { GlassButton, GlassPill } from "../../ui/glass";
import { Icon, type IconName } from "../../ui/icons";
import { Button, Plate, Text } from "../../ui/primitives";
import { Segmented } from "../../ui/segmented";
import { OnGlass } from "../../ui/surface";
import { Row, Sub, Variants } from "../frame";

const MONO = { fontFamily: "Menlo", letterSpacing: 0 } as const;

function Swatch({ token, note }: { token: keyof Palette; note: string }) {
  const p = usePalette();
  return (
    <View className="flex-row items-center gap-3">
      <View
        className="size-11 rounded-md border border-edge"
        style={{ backgroundColor: p[token] }}
      />
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium text-text" style={MONO}>
          {token}
        </Text>
        <Text className="text-sm text-muted">{note}</Text>
      </View>
      <Text className="text-xs text-muted" style={MONO}>
        {p[token]}
      </Text>
    </View>
  );
}

function Swatches({ items }: { items: [keyof Palette, string][] }) {
  return (
    <View className="gap-3">
      {items.map(([token, note]) => (
        <Swatch key={token} token={token} note={note} />
      ))}
    </View>
  );
}

export function Colour() {
  return (
    <>
      <Sub
        title="Surfaces"
        note="Every surface is one of these. The plate is lighter than the room in both rooms; dark is a warm room of its own, not an inversion."
        source="packages/design/tokens.css"
      >
        <Variants
          items={[
            {
              label: "Room and plates",
              render: () => (
                <Swatches
                  items={[
                    ["canvas", "The room: the page itself"],
                    ["sheet", "What rises over the room: a sheet, lighter at night"],
                    ["plate", "A thing in the room: a card, a row group, a control"],
                    ["plate-2", "A well in a plate: a chip, a track"],
                    ["chosen", "The chosen option riding in a plate-2 track"],
                    ["edge", "The hairline every plate carries"],
                    ["edge-2", "A stronger edge: focus, a pressed plate"],
                  ]}
                />
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Ink"
        note="Text on the room meets 4.5:1 in both rooms, muted included. Faint never carries words."
      >
        <Variants
          items={[
            {
              label: "Text",
              render: () => (
                <Swatches
                  items={[
                    ["text", "The term, a title, what the screen is about"],
                    ["text-2", "Supporting prose, a secondary label, a ghost button"],
                    ["muted", "Metadata, a hint, a placeholder"],
                    ["faint", "Decoration that is not a word"],
                  ]}
                />
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Amber means act"
        note="The flame, the one primary button, capture, a due count, a day reviewed and the Easy grade. Never a selected state, a heading or decoration."
      >
        <Variants
          items={[
            {
              label: "Fill, tint and mark",
              note: "A fill carries amber-ink; an icon beside a word uses amber-mark.",
              render: () => (
                <Swatches
                  items={[
                    ["amber", "The one thing to press"],
                    ["amber-ink", "Ink on amber"],
                    ["amber-tint", "A due count’s ground"],
                    ["amber-mark", "An icon beside a word, as Easy"],
                  ]}
                />
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Marks"
        note="Card states, grades and the AI each have one colour, always with an icon and a word, so colour is never read alone."
      >
        <Variants
          items={[
            {
              label: "States",
              render: () => (
                <Swatches
                  items={[
                    ["state-new", "New: a grey dashed circle"],
                    ["state-learning", "Learning: a blue half circle"],
                    ["state-known", "Known: a green check circle"],
                  ]}
                />
              ),
            },
            {
              label: "Grades, errors and the AI",
              render: () => (
                <Swatches
                  items={[
                    ["grade-forgot", "Forgot, and every error"],
                    ["good", "Good, and a success"],
                    ["ai", "What the AI wrote, on its badge only"],
                  ]}
                />
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

const STEPS: [string, number, string][] = [
  ["text-6xl", 68, "Today’s due count under the lantern"],
  ["text-4xl", 40, "The streak’s number; Lymi on Welcome"],
  ["text-3xl", 34, "A screen’s title in its bar"],
  ["text-2xl", 28, "The heading at the end of a review"],
  ["text-xl", 22, "A sheet’s title; a meaning"],
  ["text-lg", 20, "A section title; a term in a row; the xl button"],
  ["text-md", 17, "Body: what iOS reads at; buttons and fields"],
  ["text-base", 15, "Secondary text, descriptions, hints"],
  ["text-sm", 13, "A field’s label; a small button; a chip"],
  ["text-xs", 12, "A caption, a chip, a due count, a weekday’s letter"],
];

export function Type() {
  return (
    <>
      <Sub
        title="The phone’s ramp"
        note="Onest, under the web’s step names, sized for iOS’s 17 pt body. These ten are every size the phone uses; a new one is a design question, not a class. Display steps keep a 1.2 line box, because iOS clips glyphs that rise past it. 400 reads, 500 names, 600 counts; never 700."
        source="src/global.css"
      >
        <Variants
          items={STEPS.map(([step, size, use]) => ({
            label: `${step} · ${size} pt`,
            note: use,
            render: () => (
              <Text
                className={`${step} ${size >= 20 ? "font-medium" : ""} text-text`}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
              >
                {size >= 40 ? "hämarik" : "Kohv, the word for coffee"}
              </Text>
            ),
          }))}
        />
      </Sub>
      <Sub
        title="Dynamic Type"
        note="Text follows the reader’s size through the iOS text style nearest it. Reading text grows the furthest; the word and the counts grow least, so a screen never breaks. Tracking follows the size the text is drawn at."
        source="src/theme/type.ts"
      />
    </>
  );
}

const ICON_SET: IconName[] = [
  "today",
  "library",
  "you",
  "deck",
  "section",
  "plus",
  "close",
  "back",
  "forward",
  "down",
  "check",
  "more",
  "undo",
  "alert",
  "show",
  "hide",
  "email",
  "signOut",
  "play",
  "pointer",
  "widgets",
  "sun",
  "moon",
  "lesson",
  "manual",
];

export function Icons() {
  const p = usePalette();
  return (
    <>
      <Sub
        title="Lucide, as on the web"
        note="One set with one 2 pt stroke, named for what each icon means here. A mark that stands for a state or grade draws at 2.25 so it still reads at 12 pt. Menus use them too."
        source="src/ui/icons.tsx"
      >
        <Variants
          items={[
            {
              label: "The set",
              render: () => (
                <View className="flex-row flex-wrap">
                  {ICON_SET.map((name) => (
                    <View key={name} className="w-1/4 items-center gap-1.5 py-3">
                      <Icon name={name} size={22} colour={p.text} />
                      <Text className="text-xs text-muted" style={MONO}>
                        {name}
                      </Text>
                    </View>
                  ))}
                </View>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Size follows the text"
        note="An icon is as tall as the capital letters beside it, a little more: it never outweighs the word it sits with."
      >
        <Variants
          items={(
            [
              [14, "text-xs", "Beside 12–13 pt text: a chip, an error line"],
              [16, "text-sm", "Beside 13–15 pt text: a small button, a field chip"],
              [18, "text-md", "Beside 17 pt text: a button, a row"],
              [20, "text-lg", "Beside 20 pt text, or alone in a 44 pt button"],
            ] as const
          ).map(([size, step, note]) => ({
            label: `${size} pt`,
            note,
            render: () => (
              <View className="flex-row items-center gap-2">
                <Icon name="deck" size={size} colour={p["text-2"]} />
                <Text className={`${step} text-text`}>Lezione 12</Text>
              </View>
            ),
          }))}
        />
      </Sub>
      <Sub
        title="Colour"
        note="An icon takes the colour of the text beside it. Only a mark has its own: a state, a grade, the AI, an error."
      >
        <Variants
          items={[
            {
              label: "Marks",
              render: () => (
                <Row>
                  <Icon name="new" size={20} colour={p["state-new"]} strokeWidth={2.25} />
                  <Icon name="learning" size={20} colour={p["state-learning"]} strokeWidth={2.25} />
                  <Icon name="known" size={20} colour={p["state-known"]} strokeWidth={2.25} />
                  <Icon name="forgot" size={20} colour={p["grade-forgot"]} strokeWidth={2.25} />
                  <Icon name="hard" size={20} colour={p["grade-hard"]} strokeWidth={2.25} />
                  <Icon name="good" size={20} colour={p["grade-good"]} strokeWidth={2.25} />
                  <Icon name="easy" size={20} colour={p["grade-easy"]} strokeWidth={2.25} />
                  <Icon name="ai" size={20} colour={p.ai} strokeWidth={2.25} />
                  <Icon name="alert" size={20} colour={p.danger} strokeWidth={2.25} />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

/** Something with light and shape under it, so glass has something to show through. */
function Backdrop({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <View
      className="justify-center overflow-hidden rounded-lg p-4"
      style={
        {
          experimental_backgroundImage: `linear-gradient(135deg, ${p.amber}, ${p.canvas} 55%, ${p.ai})`,
        } as ViewStyle
      }
    >
      {children}
    </View>
  );
}

function GlassPanel({ children }: { children: ReactNode }) {
  if (!isGlassEffectAPIAvailable())
    return <View className="rounded-2xl bg-sheet p-4">{children}</View>;
  return (
    <GlassView glassEffectStyle="regular" style={{ borderRadius: 30, padding: 16 }}>
      {children}
    </GlassView>
  );
}

export function Surfaces() {
  const glass = isGlassEffectAPIAvailable();
  return (
    <>
      <Sub
        title="Plates"
        note="By day every surface is flat, with one hairline. At night a plate sits a little off the room on a soft shadow. A field, a chip and a well never lift."
        source="src/ui/primitives.tsx"
      >
        <Variants
          items={[
            {
              label: "Plate",
              note: "A card, a row group, a panel. Switch the room to see the lift.",
              render: () => (
                <Plate className="p-4">
                  <Text className="text-md font-medium text-text">Lezione 12</Text>
                  <Text className="text-base text-muted">24 cards · 6 due</Text>
                </Plate>
              ),
            },
            {
              label: "Well",
              note: "Set into its plate: a track, a chip’s ground.",
              render: () => (
                <Plate className="p-4">
                  <View className="h-11 justify-center rounded-md bg-plate-2 px-3">
                    <Text className="text-base text-text-2">A well in a plate</Text>
                  </View>
                </Plate>
              ),
            },
            {
              label: "Key light",
              note: "The one button to press carries a soft fall of light along its top.",
              render: () => <Button label="Review" variant="primary" size="lg" />,
            },
          ]}
        />
      </Sub>
      <Sub
        title="Liquid Glass"
        note="iOS draws it, untinted, for what floats: sheets, their corner buttons, the tab bar and capture. Tinted amber, it marks the one standing action. Reduce Transparency and iOS before 26 get opaque surfaces instead."
        source="docs/design/system/surfaces.md"
      >
        <Variants
          items={[
            {
              label: glass ? "Glass over the room" : "Opaque here: this iOS has no Liquid Glass",
              render: () => (
                <Backdrop>
                  <View className="flex-row items-center justify-between">
                    <GlassButton icon="close" label="Done" />
                    <GlassPill icon="deck">Verbi</GlassPill>
                    <GlassButton icon="plus" label="Add" primary />
                  </View>
                </Backdrop>
              ),
            },
            {
              label: "On glass",
              note: "A plate, a field or a track on glass lets it through and takes its colour, as iOS’s own grouped rows do; nothing lifts off a surface that already floats.",
              render: () => (
                <Backdrop>
                  <GlassPanel>
                    <OnGlass>
                      <View className="gap-3">
                        <Plate className="p-4">
                          <Text className="text-md font-medium text-text">Daily goal</Text>
                          <Text className="text-base text-muted">50 reviews a day</Text>
                        </Plate>
                        <Segmented
                          label="Daily goal"
                          value="50"
                          options={["10", "25", "50"].map((v) => ({ value: v, label: v }))}
                          onChange={() => undefined}
                        />
                      </View>
                    </OnGlass>
                  </GlassPanel>
                </Backdrop>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

const HAPTICS: [string, string, () => void][] = [
  ["A press", "Selection, from Press, on every button and row", () => Haptics.selectionAsync()],
  ["Reveal", "Light impact", () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)],
  [
    "A grade",
    "Soft impact, Forgot included",
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  ],
  ["Undo, or crossing the line pulling to end", "Selection", () => Haptics.selectionAsync()],
  [
    "The daily goal",
    "Success",
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  ],
  [
    "The end of a review",
    "A faint tick under each ember and a warm pulse as today's light fills, through Core Haptics",
    () => void playHaptics(endHaptics(endEmbers(14), true, false)),
  ],
  [
    "Starting a review",
    "Medium impact",
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  ],
];

export function Motion() {
  const [range, setRange] = useState("week");
  return (
    <>
      <Sub
        title="Press"
        note="A press gives 3% over 150 ms and answers with a light tap. Nothing moves up. Under Reduce Motion it does not scale."
        source="src/ui/primitives.tsx"
      >
        <Variants
          items={[
            {
              label: "Press and hold",
              render: () => (
                <Row>
                  <Button label="Save" />
                  <Button label="Add card" variant="primary" />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Choices"
        note={`The chosen plate springs to the new option with a trace of overshoot: ${Math.round(CHOICE_SLIDE.duration * 1000)} ms. The switch’s thumb uses the same spring.`}
        source="packages/design/src/motion.ts"
      >
        <Variants
          items={[
            {
              label: "Segmented",
              render: () => (
                <Segmented
                  label="Range"
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: "week", label: "Week" },
                    { value: "month", label: "Month" },
                    { value: "year", label: "Year" },
                  ]}
                />
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

export function HapticsPage() {
  return (
    <Sub
      title="Haptics"
      note="A haptic answers a touch or marks the goal. These are all of them; tap each to feel it."
      source="docs/design/system/phone.md"
    >
      <Variants
        items={HAPTICS.map(([moment, kind, play]) => ({
          label: moment,
          note: kind,
          render: () => <Button label="Feel it" size="sm" onPress={play} />,
        }))}
      />
    </Sub>
  );
}
