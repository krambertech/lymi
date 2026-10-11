import { useState } from "react";
import { View } from "react-native";
import { AiCardChip, Chip, SourceChip, StateChip } from "../../ui/chip";
import { DueCount } from "../../ui/due-count";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  PasswordInput,
  Textarea,
} from "../../ui/field";
import { FieldChip, FieldChipFace, FieldChipRow } from "../../ui/field-chip";
import { GRADES, GradeMark } from "../../ui/grade";
import { Select, SelectTrigger } from "../../ui/menu";
import {
  Button,
  type ButtonVariant,
  ForcedStateContext,
  IconButton,
  Text,
} from "../../ui/primitives";
import { Progress } from "../../ui/progress";
import { Segmented } from "../../ui/segmented";
import { Skeleton } from "../../ui/skeleton";
import { StateIcon } from "../../ui/state-mark";
import { Switch } from "../../ui/switch";
import { Grid, Row, Sub, Variants } from "../frame";

const DECKS = [
  { value: "lezione", label: "Lezione 12" },
  { value: "verbi", label: "Verbi" },
  { value: "work", label: "Words from work" },
];

function States({ variant }: { variant: ButtonVariant }) {
  return (
    <Grid>
      <Button label="Default" variant={variant} />
      <ForcedStateContext.Provider value="pressed">
        <Button label="Pressed" variant={variant} />
      </ForcedStateContext.Provider>
      <Button label="Disabled" variant={variant} disabled />
      <Button label="Adding" variant={variant} loading />
    </Grid>
  );
}

export function Actions() {
  return (
    <>
      <Sub
        title="Button"
        note="Secondary is the default, so leave the variant off for an ordinary action. Each shows default, pressed (3% smaller), disabled and loading."
        source="src/ui/primitives.tsx"
      >
        <Variants
          items={[
            {
              label: "Primary",
              note: "The one thing to press on the view. Amber, once per view.",
              render: () => <States variant="primary" />,
            },
            {
              label: "Secondary",
              note: "Every other action. A plate with an edge.",
              render: () => <States variant="secondary" />,
            },
            {
              label: "Ghost",
              note: "A way out or a quiet action beside others: Done, Cancel, Undo.",
              render: () => <States variant="ghost" />,
            },
            {
              label: "Danger",
              note: "Archives or removes. Its label names the consequence.",
              render: () => <States variant="danger" />,
            },
          ]}
        />
      </Sub>
      <Sub
        title="Sizes"
        note="Every control on the phone is 44 pt, so md is 44. Never resize a button by hand: if no size fits, the design is asking for something new."
      >
        <Variants
          items={[
            {
              label: "xl · 64 pt",
              note: "Today’s Review, full width. Nowhere else.",
              render: () => <Button label="Review" variant="primary" size="xl" />,
            },
            {
              label: "lg · 48 pt",
              note: "The end of a flow, where the button is the whole answer: sign-in, Done.",
              render: () => <Button label="Sign in" variant="primary" size="lg" />,
            },
            {
              label: "md · 44 pt",
              note: "Forms and sheets. The default.",
              render: () => (
                <Row>
                  <Button label="Save" />
                </Row>
              ),
            },
            {
              label: "sm · 32 pt",
              note: "In a row or a header. Its hit area still reaches 44 pt.",
              render: () => (
                <Row>
                  <Button label="Undo" size="sm" variant="ghost" />
                  <Button label="Rename" size="sm" />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Icon button"
        note="One icon whose meaning carries alone. The label is required: it names the action for VoiceOver, never the icon."
        source="src/ui/primitives.tsx"
      >
        <Variants
          items={[
            {
              label: "Ghost",
              note: "Row and header actions: options, close. The default.",
              render: () => (
                <Row>
                  <IconButton icon="more" label="Card options" />
                  <IconButton icon="close" label="End review" />
                  <IconButton icon="more" label="Card options" size="sm" />
                </Row>
              ),
            },
            {
              label: "Primary, round",
              note: "Capture. Default, pressed and unavailable.",
              render: () => (
                <Row>
                  <IconButton icon="plus" label="Add a card" variant="primary" round />
                  <ForcedStateContext.Provider value="pressed">
                    <IconButton icon="plus" label="Add a card" variant="primary" round />
                  </ForcedStateContext.Provider>
                  <IconButton icon="plus" label="Add a card" variant="primary" round disabled />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

export function Forms() {
  const [term, setTerm] = useState("");
  return (
    <>
      <Sub
        title="A form row is a Field"
        note="The label above, one control, then its hint or error under it. The parts wire themselves: the label names the control for VoiceOver, and an error marks it and takes the hint’s place."
        source="src/ui/field.tsx"
      >
        <Variants
          items={[
            {
              label: "Default",
              note: "Tap it to see focus.",
              render: () => (
                <Field>
                  <FieldLabel>Term</FieldLabel>
                  <Input value={term} onChangeText={setTerm} placeholder="A word or phrase" />
                  <FieldDescription>In the language you are learning.</FieldDescription>
                </Field>
              ),
            },
            {
              label: "Focused",
              note: "The edge darkens; nothing else moves.",
              render: () => (
                <ForcedStateContext.Provider value="focused">
                  <Field>
                    <FieldLabel>Term</FieldLabel>
                    <Input defaultValue="parlare" />
                  </Field>
                </ForcedStateContext.Provider>
              ),
            },
            {
              label: "Error",
              note: "Says how to fix it, with its icon. Forms validate on submit, never by disabling the button.",
              render: () => (
                <Field>
                  <FieldLabel>Term</FieldLabel>
                  <Input placeholder="A word or phrase" />
                  <FieldError>Type the term.</FieldError>
                </Field>
              ),
            },
            {
              label: "Optional, and disabled",
              note: "An aside at the end of the label row. Disabled reaches the control.",
              render: () => (
                <View className="gap-4">
                  <Field>
                    <FieldLabel aside={<Text className="text-sm text-muted">Optional</Text>}>
                      Meaning
                    </FieldLabel>
                    <Input placeholder="Leave it empty and the AI fills it in" />
                  </Field>
                  <Field disabled>
                    <FieldLabel>Language</FieldLabel>
                    <Input defaultValue="Italian" />
                  </Field>
                </View>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Controls"
        note="Every box is 44 pt with 17 pt text; a textarea grows with what is typed. Never a larger cut for the field that matters."
        source="src/ui/field.tsx"
      >
        <Variants
          items={[
            {
              label: "Password",
              note: "Shows what was typed from the end of the box.",
              render: () => (
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <PasswordInput defaultValue="lantern-at-dusk" />
                </Field>
              ),
            },
            {
              label: "Textarea",
              note: "More than one line, such as notes.",
              render: () => (
                <Field>
                  <FieldLabel>Notes</FieldLabel>
                  <Textarea defaultValue={"hea aeg → head aega\nThe partitive after a number."} />
                </Field>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

export function Choices() {
  const [enrich, setEnrich] = useState(true);
  const [sound, setSound] = useState(false);
  const [range, setRange] = useState("week");
  const [deck, setDeck] = useState("lezione");
  const deckName = DECKS.find((d) => d.value === deck)?.label ?? "";
  return (
    <>
      <Sub
        title="Switch"
        note="On or off, taking effect the moment it changes. It sits beside its label in a horizontal Field, and the whole row presses it. Amber when on, drawn by Lymi so it matches the form."
        source="src/ui/switch.tsx"
      >
        <Variants
          items={[
            {
              label: "On",
              render: () => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>Fill in the rest</FieldLabel>
                    <FieldDescription>
                      Meaning, example and pronunciation, marked as AI.
                    </FieldDescription>
                  </FieldContent>
                  <Switch checked={enrich} onCheckedChange={setEnrich} />
                </Field>
              ),
            },
            {
              label: "Off",
              render: () => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>Sound at the goal</FieldLabel>
                  </FieldContent>
                  <Switch checked={sound} onCheckedChange={setSound} />
                </Field>
              ),
            },
            {
              label: "Disabled",
              render: () => (
                <Field orientation="horizontal" disabled>
                  <FieldContent>
                    <FieldLabel>Reminders</FieldLabel>
                  </FieldContent>
                  <Switch checked onCheckedChange={() => undefined} />
                </Field>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Segmented"
        note="Two to four short views of the same thing. The chosen plate springs across."
        source="src/ui/segmented.tsx"
      >
        <Variants
          items={[
            {
              label: "Three options",
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
      <Sub
        title="Select"
        note="One of up to fifteen options, such as a deck. The list rises in a glass sheet titled with the field’s name, the chosen row leading with a check."
        source="src/ui/menu.tsx"
      >
        <Variants
          items={[
            {
              label: "In a form",
              note: "The same 44 pt box as every control. Tap it.",
              render: () => (
                <Field>
                  <FieldLabel>Deck</FieldLabel>
                  <Select
                    label="Deck"
                    value={deck}
                    options={DECKS}
                    onChange={setDeck}
                    trigger={<SelectTrigger>{deckName}</SelectTrigger>}
                  />
                </Field>
              ),
            },
            {
              label: "As a field chip",
              note: "Where a row of chips holds a card’s settings.",
              render: () => (
                <Row>
                  <Select
                    label="Deck"
                    value={deck}
                    options={DECKS}
                    onChange={setDeck}
                    trigger={
                      <FieldChipFace icon="deck" on opens>
                        {deckName}
                      </FieldChipFace>
                    }
                  />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Field chip"
        note="One optional field or setting of a card: its icon and label while empty, its value once set. A row of them scrolls sideways and fades at the edge with more."
        source="src/ui/field-chip.tsx"
      >
        <Variants
          items={[
            {
              label: "Empty, set, AI on",
              render: () => (
                <FieldChipRow label="More about this card">
                  <FieldChip icon="plus" onPress={() => undefined}>
                    Example
                  </FieldChip>
                  <FieldChip icon="check" on checked onPress={() => undefined}>
                    Meaning
                  </FieldChip>
                  <FieldChip icon="ai" tone="ai" on checked onPress={() => undefined}>
                    AI fills in
                  </FieldChip>
                  <FieldChip icon="plus" onPress={() => undefined}>
                    Pronunciation
                  </FieldChip>
                </FieldChipRow>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

export function Labels() {
  return (
    <>
      <Sub
        title="Chip"
        note="A small label that describes. Never a button and never amber. Tones: default, ai, danger."
        source="src/ui/chip.tsx"
      >
        <Variants
          items={[
            {
              label: "sm and md",
              note: "md on its own; sm beside other text in a row.",
              render: () => (
                <Row>
                  <Chip size="sm">Owner</Chip>
                  <Chip>Importing</Chip>
                </Row>
              ),
            },
            {
              label: "Danger",
              note: "A status that failed.",
              render: () => (
                <Row>
                  <Chip tone="danger">Stopped</Chip>
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="State chip and mark"
        note="A card’s state as its icon on a plain chip, so the colour is the mark’s alone. Under review a relearning card says Forgotten with the Forgot mark."
        source="src/ui/state-mark.tsx"
      >
        <Variants
          items={[
            {
              label: "States, and Forgotten under review",
              note: "One size everywhere. Forgotten shows only on a card under review.",
              render: () => (
                <Row>
                  <StateChip state={0} />
                  <StateChip state={1} />
                  <StateChip state={2} />
                  <StateChip state={3} inReview />
                </Row>
              ),
            },
            {
              label: "Mark alone",
              note: "Beside a count or in a row.",
              render: () => (
                <View className="flex-row items-center gap-5">
                  {(
                    [
                      ["new", 8],
                      ["learning", 12],
                      ["known", 31],
                    ] as const
                  ).map(([state, n]) => (
                    <View key={state} className="flex-row items-center gap-1.5">
                      <StateIcon state={state} size={16} />
                      <Text
                        className="text-base text-text"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {n}
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
        title="Source chip"
        note="Who wrote a field. The AI is always labelled and is the one source with a colour; the lesson and the learner are the ordinary case."
        source="src/ui/chip.tsx"
      >
        <Variants
          items={[
            {
              label: "Badge",
              note: "Beside a field’s label: the mark and one word, with the whole sentence for VoiceOver.",
              render: () => (
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-sm font-medium text-text-2">Meaning</Text>
                  <SourceChip source="ai" field="meaning" badge />
                </View>
              ),
            },
            {
              label: "Full",
              render: () => (
                <Row>
                  <SourceChip source="ai" field="meaning" />
                  <SourceChip source="lesson" field="example" />
                  <SourceChip source="manual" field="meaning" />
                </Row>
              ),
            },
            {
              label: "A whole card",
              note: "Under a review’s answer, once, when any shown field is the AI’s.",
              render: () => (
                <Row>
                  <AiCardChip />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Due count"
        note="How many cards are due, in ink on the lantern’s amber as a tint."
        source="src/ui/due-count.tsx"
      >
        <Variants
          items={[
            {
              label: "In a row",
              note: "One size: the phone has no row that leads with a large count.",
              render: () => (
                <Row>
                  <DueCount count={6} />
                  <DueCount count={128} />
                </Row>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Grade mark"
        note="A grade as the review draws it: its button’s icon and colour, in a fixed square so a column of them lines up."
        source="src/ui/grade.tsx"
      >
        <Variants
          items={[
            {
              label: "Forgot, Hard, Good, Easy",
              render: () => (
                <Row>
                  {GRADES.map((g) => (
                    <GradeMark key={g.rating} rating={g.rating} />
                  ))}
                </Row>
              ),
            },
          ]}
        />
      </Sub>
    </>
  );
}

export function Feedback() {
  return (
    <>
      <Sub
        title="Progress"
        note="The session’s track: eight points, inside the card’s width, in ink. Its label is read, not shown."
        source="src/ui/progress.tsx"
      >
        <Variants
          items={[
            {
              label: "7 of 20",
              render: () => <Progress value={0.35} label="7 of 20 cards" />,
            },
          ]}
        />
      </Sub>
      <Sub
        title="Skeleton"
        note="Holds a shape while it loads, or while the AI writes a field. A light sweeps across it only when motion is welcome."
        source="src/ui/skeleton.tsx"
      >
        <Variants
          items={[
            {
              label: "The AI writing a meaning",
              render: () => (
                <View className="gap-2">
                  <Text className="text-lg font-medium text-text">parlare</Text>
                  <Skeleton width="62%" height={10} />
                </View>
              ),
            },
          ]}
        />
      </Sub>
      <Sub
        title="Loading"
        note="A button keeps its width while its request runs, shows a spinner and swallows a second press."
        source="src/ui/primitives.tsx"
      >
        <Variants
          items={[
            {
              label: "Adding",
              render: () => <Button label="Add to Verbi" variant="primary" size="lg" loading />,
            },
          ]}
        />
      </Sub>
    </>
  );
}
