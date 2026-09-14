import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/Button";
import { Checkbox } from "../../components/Checkbox";
import { CopyField } from "../../components/CopyField";
import { LanguageField } from "../../components/DeckFields";
import { Segmented } from "../../components/Segmented";
import { Switch } from "../../components/Switch";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "../../components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Variants } from "../Frame";
import type { Group } from "./types";

const DECKS = [
  { value: "d1", label: "Lesson 14" },
  { value: "d2", label: "Portuguese" },
  { value: "d3", label: "Українська для Марко" },
];

const DIRECTIONS = [
  { value: "recognise", label: "IT → EN" },
  { value: "produce", label: "EN → IT" },
  { value: "both", label: "Both" },
];

const box = "w-full max-w-sm";

export const forms: Group = {
  slug: "forms",
  title: "Forms",
  lede: "Every control in a form is the same box: 44 px tall on the phone, 40 on the desktop, 16 px text so iOS does not zoom. A form reads as one row repeated, not a pile of different objects. Errors arrive on submit with an icon, never by taking the button away.",
  entries: [
    {
      slug: "field",
      name: "Field",
      source: "components/ui/field.tsx",
      note: "The parts of a form row. The label names the control, and the description and error describe it, with no id written by hand.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Label and control",
              note: "A label above the box, always visible.",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Term</FieldLabel>
                  <Input placeholder="sbrigarsi" defaultValue="la ringhiera" />
                </Field>
              ),
            },
            {
              label: "With a description",
              note: "One sentence on how the field works, read after the label.",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Name</FieldLabel>
                  <Input placeholder="Backup script on the laptop" />
                  <FieldDescription>So you know which key to revoke later.</FieldDescription>
                </Field>
              ),
            },
            {
              label: "Optional",
              note: "A note at the end of the label row. The description says what happens if it stays empty.",
              render: () => (
                <Field className={box}>
                  <FieldLabel aside="Optional">Meaning</FieldLabel>
                  <Input placeholder="to hurry up" />
                  <FieldDescription>Leave it empty and AI can fill it in later.</FieldDescription>
                </Field>
              ),
            },
            {
              label: "Error",
              note: "After submit. An error with something to say marks the field and its control invalid together, and the caret goes to the first one. Where a field has a description, the error takes its place.",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Source</FieldLabel>
                  <Input defaultValue="Il Gattopardo, chapter two, the long passage about the ballroom and everything Tancredi said" />
                  <FieldError>Keep it under 200 characters.</FieldError>
                </Field>
              ),
            },
            {
              label: "Several errors",
              note: "Issues from a form library, each message once.",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Tag</FieldLabel>
                  <Input defaultValue="portuguese brazil" />
                  <FieldError
                    errors={[
                      { message: "Use a language tag like ca, pt-BR or zh-Hant." },
                      { message: "Keep the language tag under 12 characters." },
                      { message: "Use a language tag like ca, pt-BR or zh-Hant." },
                    ]}
                  />
                </Field>
              ),
            },
            {
              label: "Disabled",
              note: "Set on the field, it reaches the control.",
              render: () => (
                <Field disabled className={box}>
                  <FieldLabel>Deck name</FieldLabel>
                  <Input defaultValue="Lesson 14" />
                </Field>
              ),
            },
            {
              label: "Beside its label",
              note: "For a narrow panel such as the developer tools. The description stays under the control.",
              render: () => (
                <Field orientation="horizontal" className={box}>
                  <FieldLabel className="mt-2.5 w-20 shrink-0">Persona</FieldLabel>
                  <FieldContent>
                    <Input defaultValue="Learner" />
                    <FieldDescription>Forty cards, two decks, a week of reviews.</FieldDescription>
                  </FieldContent>
                </Field>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "field-set",
      name: "Field set",
      source: "components/ui/field.tsx",
      note: "Fields that belong together, named once by a legend.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "A group of fields",
              note: "The description under the legend describes the whole set.",
              render: () => (
                <FieldSet className={box}>
                  <FieldLegend>Card</FieldLegend>
                  <FieldDescription>What you type here is what the card shows.</FieldDescription>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Term</FieldLabel>
                      <Input defaultValue="sbrigarsi" />
                    </Field>
                    <Field>
                      <FieldLabel aside="Optional">Meaning</FieldLabel>
                      <Input placeholder="to hurry up" />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              ),
            },
            {
              label: "A legend as a label",
              note: "For a row whose control is not a box, such as the button that makes the first deck. The legend names the group, and the button keeps its own name.",
              render: () => (
                <FieldSet className={`gap-1.5 ${box}`}>
                  <FieldLegend variant="label">Deck</FieldLegend>
                  <Button>
                    <Plus aria-hidden="true" />
                    New deck
                  </Button>
                  <FieldDescription>
                    A card lands in a deck. Create the first one and this card goes in it.
                  </FieldDescription>
                </FieldSet>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "input",
      name: "Input",
      source: "components/ui/input.tsx",
      note: "One line of text. It takes its name, description and state from the field around it.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Search",
              note: "The icon sits inside the box. With no field around it, the name comes from aria-label.",
              render: () => (
                <div className={`relative ${box}`}>
                  <Search
                    className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <Input placeholder="Search this deck" aria-label="Search" className="ps-9" />
                </div>
              ),
            },
            {
              label: "Disabled",
              note: "Cannot change right now.",
              render: () => (
                <Input disabled defaultValue="Lesson 14" aria-label="Deck name" className={box} />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "textarea",
      name: "Textarea",
      source: "components/ui/textarea.tsx",
      note: "More than a line: notes, a mnemonic, where you heard it. It grows by dragging, never on its own.",
      Demo: function TextareaDemo() {
        const [text, setText] = useState("");
        return (
          <Variants
            items={[
              {
                label: "Default",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Notes</FieldLabel>
                    <Textarea
                      placeholder="Grammar, a mnemonic, where you heard it"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </Field>
                ),
              },
              {
                label: "Error",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea defaultValue="Cards from Marco’s Tuesday lessons, and the words from the film club, and everything from the trip to Bologna in March." />
                    <FieldError>Keep the description under 500 characters.</FieldError>
                  </Field>
                ),
              },
              {
                label: "Disabled",
                render: () => (
                  <Field disabled className={box}>
                    <FieldLabel>Notes</FieldLabel>
                    <Textarea defaultValue="Reflexive: mi sbrigo, ti sbrighi." />
                  </Field>
                ),
              },
            ]}
          />
        );
      },
    },
    {
      slug: "segmented",
      name: "Segmented",
      source: "components/Segmented.tsx",
      note: "Two to four views of the same thing. A plate-2 track with the chosen plate inside it, the same shape as the phone’s navigation pill.",
      Demo: function SegmentedDemo() {
        const [seg, setSeg] = useState("recognise");
        return (
          <Variants
            items={[
              {
                label: "Medium",
                note: "In forms, the same height as every other control.",
                render: () => (
                  <Segmented label="Direction" value={seg} onChange={setSeg} options={DIRECTIONS} />
                ),
              },
              {
                label: "Small",
                note: "Inside a plate or a frame, where a full-height control would crowd it.",
                render: () => (
                  <Segmented
                    size="sm"
                    label="Direction"
                    value={seg}
                    onChange={setSeg}
                    options={DIRECTIONS}
                  />
                ),
              },
            ]}
          />
        );
      },
    },
    {
      slug: "switch",
      name: "Switch",
      source: "components/Switch.tsx",
      note: "A setting that applies the moment it changes. Nothing next to it has a Save button.",
      Demo: function SwitchDemo() {
        const [on, setOn] = useState(true);
        const [off, setOff] = useState(false);
        return (
          <Variants
            items={[
              {
                label: "On",
                render: () => <Switch checked={on} onChange={setOn} label="Show AI examples" />,
              },
              {
                label: "Off, with a description",
                note: "One more sentence when the label cannot say it all.",
                render: () => (
                  <Switch
                    checked={off}
                    onChange={setOff}
                    label="Play audio automatically"
                    description="Off by default. Audio always has a visible control."
                  />
                ),
              },
            ]}
          />
        );
      },
    },
    {
      slug: "checkbox",
      name: "Checkbox",
      source: "components/Checkbox.tsx",
      note: "For lists, and for a second choice that rides along with an action.",
      Demo: function CheckboxDemo() {
        const [off, setOff] = useState(false);
        const [on, setOn] = useState(true);
        return (
          <Variants
            items={[
              {
                label: "Unchecked",
                render: () => (
                  <Checkbox
                    checked={off}
                    onChange={setOff}
                    label="Also archive its review history"
                  />
                ),
              },
              {
                label: "Checked",
                render: () => (
                  <Checkbox checked={on} onChange={setOn} label="Include AI examples" />
                ),
              },
            ]}
          />
        );
      },
    },
    {
      slug: "copy-field",
      name: "Copy field",
      source: "components/CopyField.tsx",
      note: "A secret you have to move somewhere else. Mono, because it is proofread character by character. Selectable, because the clipboard is not always allowed.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Ready to copy",
              note: "Press Copy and the button says Copied for two seconds.",
              render: () => (
                <CopyField value="lymi_sk_7Q2v0lO1Ixw9RkT4mZ8a" label="API key" className={box} />
              ),
            },
          ]}
        />
      ),
    },
  ],
};

const OWN_DECKS = DECKS.slice(0, 2);
const SHARED_DECKS = [
  { value: "d3", label: "Українська для Марко" },
  { value: "d4", label: "Eesti keel, class of 2026" },
];

function DeckSelect({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <Select value={value} onValueChange={onChange} items={DECKS} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent aria-label="Deck">
        {DECKS.map((d) => (
          <SelectItem key={d.value} value={d.value}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const select: Group = {
  slug: "select",
  title: "Select",
  lede: "For a short list. Closed, it is the same box as every other control. On a desktop a panel unfolds under it, the arrows walk the rows and typing a letter jumps to a name. On a touch device the same rows rise in a drawer, under the thumb, and swipe away. The chosen row leads with a check, and every row keeps that room so nothing shifts.",
  entries: [
    {
      slug: "select",
      name: "Select",
      source: "components/ui/select.tsx",
      Demo: function SelectDemo() {
        const [deck, setDeck] = useState<string | null>("d1");
        const [empty, setEmpty] = useState<string | null>(null);
        const [missing, setMissing] = useState<string | null>(null);
        const [grouped, setGrouped] = useState<string | null>("d3");
        return (
          <Variants
            items={[
              {
                label: "Chosen",
                note: "A value is set. Open it to see the check on that row.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckSelect value={deck} onChange={setDeck} />
                  </Field>
                ),
              },
              {
                label: "Nothing chosen",
                note: "The placeholder names what to pick.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckSelect value={empty} onChange={setEmpty} placeholder="Choose a deck" />
                  </Field>
                ),
              },
              {
                label: "Error",
                note: "Submitted without a choice.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckSelect value={missing} onChange={setMissing} placeholder="Choose a deck" />
                    <FieldError>Choose a deck for this card.</FieldError>
                  </Field>
                ),
              },
              {
                label: "Disabled",
                note: "Cannot change right now, and the hint says why.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckSelect value={deck} onChange={setDeck} disabled />
                    <FieldDescription>Cannot change while a review is running.</FieldDescription>
                  </Field>
                ),
              },
              {
                label: "Groups",
                note: "Two kinds of the same thing, each under a small label, with a rule between them. The hover fill never crosses the rule.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <Select
                      value={grouped}
                      onValueChange={setGrouped}
                      items={[...OWN_DECKS, ...SHARED_DECKS]}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a deck" />
                      </SelectTrigger>
                      <SelectContent aria-label="Deck">
                        <SelectGroup>
                          <SelectLabel>Your decks</SelectLabel>
                          {OWN_DECKS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Shared with you</SelectLabel>
                          {SHARED_DECKS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ),
              },
            ]}
          />
        );
      },
    },
  ],
};

const OWN_DECK_GROUP = { value: "own", label: "Your decks", items: OWN_DECKS };
const SHARED_DECK_GROUP = { value: "shared", label: "Shared with you", items: SHARED_DECKS };

/** Decks to search, grouped the way Library groups them. */
function DeckCombobox({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const decks = [...OWN_DECKS, ...SHARED_DECKS];
  return (
    <Combobox<(typeof decks)[number]>
      items={[OWN_DECK_GROUP, SHARED_DECK_GROUP]}
      value={decks.find((d) => d.value === value) ?? null}
      onValueChange={(next) => onChange(next?.value ?? null)}
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
    >
      <ComboboxTrigger>
        <ComboboxValue placeholder="Choose a deck" />
      </ComboboxTrigger>
      <ComboboxContent aria-label="Deck">
        <ComboboxInput placeholder="Search decks" />
        <ComboboxEmpty>No deck by that name.</ComboboxEmpty>
        <ComboboxList>
          {(group: typeof OWN_DECK_GROUP, index: number) => (
            <ComboboxGroup key={group.value} items={group.items}>
              {index > 0 && <ComboboxSeparator />}
              <ComboboxLabel>{group.label}</ComboboxLabel>
              <ComboboxCollection>
                {(deck: (typeof decks)[number]) => (
                  <ComboboxItem key={deck.value} value={deck}>
                    <span className="flex-1 truncate">{deck.label}</span>
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export const combobox: Group = {
  slug: "combobox",
  title: "Combobox",
  lede: "For a list of forty. Closed, it is Select’s box. Open, it takes the machine’s shape the way Select does: a panel under the box on a desktop, a drawer under the thumb on a touch device. The search field leads, the rows filter as you type, and the first match is highlighted so Enter takes it.",
  entries: [
    {
      slug: "combobox",
      name: "Combobox",
      source: "components/ui/combobox.tsx",
      Demo: function ComboboxDemo() {
        const [lang, setLang] = useState<string | null>("it");
        const [tag, setTag] = useState<string | null>("eu");
        const [empty, setEmpty] = useState<string | null>(null);
        const [deck, setDeck] = useState<string | null>("d3");
        return (
          <Variants
            items={[
              {
                label: "Chosen",
                note: "A language is set. Open it and the search field takes focus; a name or a tag finds a row.",
                render: () => (
                  <div className={box}>
                    <LanguageField value={lang} onChange={setLang} />
                  </div>
                ),
              },
              {
                label: "A tag the list does not know",
                note: "Typed in full, a valid tag becomes the only row. Once chosen, it reads by name. Text that is not a tag is never taken.",
                render: () => (
                  <div className={box}>
                    <LanguageField value={tag} onChange={setTag} />
                  </div>
                ),
              },
              {
                label: "Error",
                note: "Submitted without a choice.",
                render: () => (
                  <div className={box}>
                    <LanguageField
                      value={empty}
                      onChange={setEmpty}
                      error="Choose the language this deck’s cards are in."
                    />
                  </div>
                ),
              },
              {
                label: "Groups",
                note: "Two kinds of the same thing, each under a small label, with a rule between them. A group with no match leaves with its label.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckCombobox value={deck} onChange={setDeck} />
                  </Field>
                ),
              },
              {
                label: "Disabled",
                note: "Cannot change right now, and the hint says why.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckCombobox value={deck} onChange={setDeck} disabled />
                    <FieldDescription>Cannot change while a review is running.</FieldDescription>
                  </Field>
                ),
              },
            ]}
          />
        );
      },
    },
  ],
};
