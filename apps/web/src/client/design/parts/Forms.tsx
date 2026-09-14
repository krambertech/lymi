import { Search } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "../../components/Checkbox";
import { CopyField } from "../../components/CopyField";
import { LanguageField } from "../../components/DeckFields";
import { Field, Input, Textarea } from "../../components/Field";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
      name: "Field and input",
      source: "components/Field.tsx",
      note: "Label above, hint or error below, wired with aria.",
      Demo: function FieldDemo() {
        const [text, setText] = useState("");
        return (
          <Variants
            items={[
              {
                label: "Default",
                note: "A label above the box, always visible.",
                render: () => (
                  <Field label="Term" className={box}>
                    <Input placeholder="sbrigarsi" defaultValue="la ringhiera" />
                  </Field>
                ),
              },
              {
                label: "Optional, with a hint",
                note: "The aside marks it optional. The hint says what happens if it stays empty.",
                render: () => (
                  <Field
                    label="Meaning"
                    aside="Optional"
                    hint="Leave it empty and AI can fill it in later."
                    className={box}
                  >
                    <Input placeholder="to hurry up" />
                  </Field>
                ),
              },
              {
                label: "Error",
                note: "After submit. An icon and a sentence that says how to fix it.",
                render: () => (
                  <Field label="Source" error="Keep it under 200 characters." className={box}>
                    <Input defaultValue="Il Gattopardo, chapter two, the long passage about the ballroom and everything Tancredi said" />
                  </Field>
                ),
              },
              {
                label: "Disabled",
                note: "Cannot change right now.",
                render: () => (
                  <Field label="Deck name" className={box}>
                    <Input disabled defaultValue="Lesson 14" />
                  </Field>
                ),
              },
              {
                label: "Search",
                note: "The icon sits inside the box; the name is still there for screen readers.",
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
                label: "Textarea",
                note: "More than a line: notes, a mnemonic, where you heard it.",
                render: () => (
                  <Field label="Notes" className={box}>
                    <Textarea
                      placeholder="Grammar, a mnemonic, where you heard it"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
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
                  <Field label="Deck" className={box}>
                    <DeckSelect value={deck} onChange={setDeck} />
                  </Field>
                ),
              },
              {
                label: "Nothing chosen",
                note: "The placeholder names what to pick.",
                render: () => (
                  <Field label="Deck" className={box}>
                    <DeckSelect value={empty} onChange={setEmpty} placeholder="Choose a deck" />
                  </Field>
                ),
              },
              {
                label: "Error",
                note: "Submitted without a choice.",
                render: () => (
                  <Field label="Deck" error="Choose a deck for this card." className={box}>
                    <DeckSelect value={missing} onChange={setMissing} placeholder="Choose a deck" />
                  </Field>
                ),
              },
              {
                label: "Disabled",
                note: "Cannot change right now, and the hint says why.",
                render: () => (
                  <Field
                    label="Deck"
                    hint="Cannot change while a review is running."
                    className={box}
                  >
                    <DeckSelect value={deck} onChange={setDeck} disabled />
                  </Field>
                ),
              },
              {
                label: "Groups",
                note: "Two kinds of the same thing, each under a small label, with a rule between them. The hover fill never crosses the rule.",
                render: () => (
                  <Field label="Deck" className={box}>
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
                  <Field label="Deck" className={box}>
                    <DeckCombobox value={deck} onChange={setDeck} />
                  </Field>
                ),
              },
              {
                label: "Disabled",
                note: "Cannot change right now, and the hint says why.",
                render: () => (
                  <Field
                    label="Deck"
                    hint="Cannot change while a review is running."
                    className={box}
                  >
                    <DeckCombobox value={deck} onChange={setDeck} disabled />
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
