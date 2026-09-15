import { Plus, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "../../components/button";
import { CopyField } from "../../components/copy-field";
import { LanguageField } from "../../components/deck-fields";
import { RadioCard } from "../../components/radio-card";
import { Segmented } from "../../components/segmented";
import { Checkbox } from "../../components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { DeviceFrames } from "../device-frame";
import { Force } from "../forced-states";
import { Variants } from "../frame";
import { DeckCombobox, DeckSelect } from "../specimens";
import type { Group } from "./types";

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
              label: "Default",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Term</FieldLabel>
                  <Input placeholder="sbrigarsi" />
                </Field>
              ),
            },
            {
              label: "Hover",
              note: "The edge strengthens under a pointer.",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Term</FieldLabel>
                  <Force state="hover" on="input">
                    <Input defaultValue="sbrigarsi" />
                  </Force>
                </Field>
              ),
            },
            {
              label: "Focus",
              note: "The edge strengthens and the ring goes around it.",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Term</FieldLabel>
                  <Force state="focus" on="input">
                    <Input defaultValue="sbrigarsi" />
                  </Force>
                </Field>
              ),
            },
            {
              label: "Invalid",
              note: "The red edge stays under hover and focus, so the field still says what is wrong while it is being fixed.",
              render: () => (
                <Field className={box}>
                  <FieldLabel>Term</FieldLabel>
                  <Force state="focus" on="input">
                    <Input defaultValue="" placeholder="sbrigarsi" />
                  </Force>
                  <FieldError>Add the term this card is for.</FieldError>
                </Field>
              ),
            },
            {
              label: "Disabled",
              note: "Cannot change right now.",
              render: () => (
                <Input disabled defaultValue="Lesson 14" aria-label="Deck name" className={box} />
              ),
            },
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
                label: "Hover",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Notes</FieldLabel>
                    <Force state="hover" on="textarea">
                      <Textarea defaultValue="Reflexive: mi sbrigo, ti sbrighi." />
                    </Force>
                  </Field>
                ),
              },
              {
                label: "Focus",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Notes</FieldLabel>
                    <Force state="focus" on="textarea">
                      <Textarea defaultValue="Reflexive: mi sbrigo, ti sbrighi." />
                    </Force>
                  </Field>
                ),
              },
              {
                label: "Invalid",
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
      source: "components/segmented.tsx",
      note: "Two to four views of the same thing, built on the Toggle Group in components/ui/toggle-group.tsx. A plate-2 track with the chosen plate inside it, the same shape as the phone’s navigation pill. The plate springs to a pointer’s choice and jumps for a key.",
      Demo: function SegmentedDemo() {
        const [seg, setSeg] = useState("recognise");
        return (
          <Variants
            items={[
              {
                label: "Medium",
                note: "In forms, the same height as every other control. Arrow keys walk the options; Space or Enter chooses.",
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
              {
                label: "Hover",
                note: "An option’s label darkens to ink under a pointer. The plate stays where the choice is.",
                render: () => (
                  <Force state="hover" on="button:not([data-pressed])">
                    <Segmented
                      label="Direction"
                      value={seg}
                      onChange={setSeg}
                      options={DIRECTIONS}
                    />
                  </Force>
                ),
              },
              {
                label: "Focus",
                note: "Tab lands on the chosen option, and the ring goes around it.",
                render: () => (
                  <Force state="focus" on="button[data-pressed]">
                    <Segmented
                      label="Direction"
                      value={seg}
                      onChange={setSeg}
                      options={DIRECTIONS}
                    />
                  </Force>
                ),
              },
              {
                label: "Disabled option",
                note: "Read out with the others, and skipped by the arrows.",
                render: () => (
                  <Segmented
                    label="Direction"
                    value={seg === "both" ? "recognise" : seg}
                    onChange={setSeg}
                    options={DIRECTIONS.map((o) => ({ ...o, disabled: o.value === "both" }))}
                  />
                ),
              },
              {
                label: "Disabled",
                render: () => (
                  <Segmented
                    disabled
                    label="Direction"
                    value={seg}
                    onChange={setSeg}
                    options={DIRECTIONS}
                  />
                ),
              },
              {
                label: "Reduced motion",
                note: "The plate fades in at the new option instead of travelling to it. Switch this canvas to reduced motion to try it.",
              },
            ]}
          />
        );
      },
    },
    {
      slug: "sliding-plate",
      name: "Sliding plate",
      source: "components/ui/sliding-plate.tsx",
      note: "The plate under a chosen option, shared by Segmented, through ToggleGroupIndicator, and the phone’s pill nav. Nothing else draws it. It springs to a choice made with a pointer in about 340 ms with a trace of overshoot, and jumps for a key, because a key already moved focus there.",
      Demo: function SlidingPlateDemo() {
        const [seg, setSeg] = useState("recognise");
        return (
          <Variants
            items={[
              {
                label: "Default",
                note: "Press another option.",
                render: () => (
                  <Segmented label="Direction" value={seg} onChange={setSeg} options={DIRECTIONS} />
                ),
              },
              {
                label: "Reduced motion",
                note: "The plate fades in at the new option instead of travelling to it. Switch this canvas to reduced motion to try it.",
              },
            ]}
          />
        );
      },
    },
    {
      slug: "switch",
      name: "Switch",
      source: "components/ui/switch.tsx",
      note: "A setting that applies the moment it changes. Nothing next to it has a Save button. Held, the thumb stretches; let go, it springs across.",
      Demo: function SwitchDemo() {
        const [on, setOn] = useState(true);
        const [off, setOff] = useState(false);
        return (
          <Variants
            items={[
              {
                label: "On",
                render: () => (
                  <Field orientation="horizontal" className={`${box} justify-between gap-4`}>
                    <FieldLabel className="text-base text-text">Show AI examples</FieldLabel>
                    <Switch checked={on} onCheckedChange={setOn} />
                  </Field>
                ),
              },
              {
                label: "Off, with a description",
                note: "One more sentence when the label cannot say it all. The track centres on the label’s first line.",
                render: () => (
                  <Field orientation="horizontal" className={`${box} gap-4`}>
                    <FieldContent className="gap-0.5">
                      <FieldLabel className="text-base text-text">
                        Play audio automatically
                      </FieldLabel>
                      <FieldDescription>
                        Off by default. Audio always has a visible control.
                      </FieldDescription>
                    </FieldContent>
                    <span className="flex h-lh shrink-0 items-center text-base">
                      <Switch checked={off} onCheckedChange={setOff} />
                    </span>
                  </Field>
                ),
              },
              {
                label: "Focus",
                render: () => (
                  <Field orientation="horizontal" className={`${box} justify-between gap-4`}>
                    <FieldLabel className="text-base text-text">Show AI examples</FieldLabel>
                    <Force state="focus">
                      <Switch checked={on} onCheckedChange={setOn} />
                    </Force>
                  </Field>
                ),
              },
              {
                label: "Invalid",
                note: "Rare for a setting that applies at once, but a required switch in a form gets the same red edge as a box.",
                render: () => (
                  <Field orientation="horizontal" className={`${box} gap-4`}>
                    <FieldContent className="gap-0.5">
                      <FieldLabel className="text-base text-text">
                        Share this deck with the class
                      </FieldLabel>
                      <FieldError>Turn this on to send the invite.</FieldError>
                    </FieldContent>
                    <span className="flex h-lh shrink-0 items-center text-base">
                      <Switch checked={false} />
                    </span>
                  </Field>
                ),
              },
              {
                label: "Disabled",
                note: "The description stays readable, because it is usually the reason.",
                render: () => (
                  <Field orientation="horizontal" disabled className={`${box} gap-4`}>
                    <FieldContent className="gap-0.5">
                      <FieldLabel className="text-base text-text">Send a daily reminder</FieldLabel>
                      <FieldDescription>
                        Notifications are blocked. Allow them in your browser settings.
                      </FieldDescription>
                    </FieldContent>
                    <span className="flex h-lh shrink-0 items-center text-base">
                      <Switch checked={false} />
                    </span>
                  </Field>
                ),
              },
              {
                label: "Reduced motion",
                note: "The thumb takes its new place at once and does not stretch while held. Switch this canvas to reduced motion to try it.",
              },
            ]}
          />
        );
      },
    },
    {
      slug: "slider",
      name: "Slider",
      source: "components/ui/slider.tsx",
      note: "A value that is easier to judge by eye than to type, such as a photo's zoom. Buttons beside it take the same value in steps, and the arrow keys move it. The thumb grows a little while it is held.",
      Demo: function SliderDemo() {
        const [zoom, setZoom] = useState(1.5);
        const step = (by: number) => setZoom((z) => Math.min(3, Math.max(1, z + by)));
        return (
          <Variants
            items={[
              {
                label: "With step buttons",
                note: "The avatar editor's zoom, from 1× to 3×.",
                render: () => (
                  <div className={`${box} flex items-center gap-2`}>
                    <IconButton label="Zoom out" size="sm" onClick={() => step(-0.25)}>
                      <ZoomOut />
                    </IconButton>
                    <Slider
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onValueChange={setZoom}
                      aria-label="Zoom"
                      className="min-w-0 flex-1"
                    />
                    <IconButton label="Zoom in" size="sm" onClick={() => step(0.25)}>
                      <ZoomIn />
                    </IconButton>
                  </div>
                ),
              },
              {
                label: "Focus",
                note: "The ring goes around the thumb. The arrow keys move it one step, and Page Up and Page Down a tenth of the way.",
                render: () => (
                  <Force state="focus" on="input">
                    <Slider
                      min={1}
                      max={3}
                      step={0.01}
                      defaultValue={2}
                      aria-label="Zoom"
                      className={box}
                    />
                  </Force>
                ),
              },
              {
                label: "Disabled",
                note: "While the photo saves.",
                render: () => (
                  <Slider
                    min={1}
                    max={3}
                    defaultValue={2}
                    disabled
                    aria-label="Zoom"
                    className={box}
                  />
                ),
              },
              {
                label: "Reduced motion",
                note: "The thumb keeps its size while it is held. Switch this canvas to reduced motion to try it.",
              },
            ]}
          />
        );
      },
    },
    {
      slug: "checkbox",
      name: "Checkbox",
      source: "components/ui/checkbox.tsx",
      note: "For lists, and for a second choice that rides along with an action. The box gives as it catches the tick, and the tick draws across.",
      Demo: function CheckboxDemo() {
        const [off, setOff] = useState(false);
        const [on, setOn] = useState(true);
        const [agreed, setAgreed] = useState(false);
        return (
          <Variants
            items={[
              {
                label: "Unchecked",
                render: () => (
                  <Field orientation="horizontal" className={box}>
                    <Checkbox checked={off} onCheckedChange={setOff} />
                    <FieldLabel className="text-base text-text">
                      Also archive its review history
                    </FieldLabel>
                  </Field>
                ),
              },
              {
                label: "Checked",
                render: () => (
                  <Field orientation="horizontal" className={box}>
                    <Checkbox checked={on} onCheckedChange={setOn} />
                    <FieldLabel className="text-base text-text">Include AI examples</FieldLabel>
                  </Field>
                ),
              },
              {
                label: "Focus",
                render: () => (
                  <Field orientation="horizontal" className={box}>
                    <Force state="focus">
                      <Checkbox checked={on} onCheckedChange={setOn} />
                    </Force>
                    <FieldLabel className="text-base text-text">Include AI examples</FieldLabel>
                  </Field>
                ),
              },
              {
                label: "Mixed",
                note: "For a checkbox that stands for several others, some of them on.",
                render: () => (
                  <Field orientation="horizontal" className={box}>
                    <Checkbox indeterminate />
                    <FieldLabel className="text-base text-text">All cards in Lesson 14</FieldLabel>
                  </Field>
                ),
              },
              {
                label: "Disabled",
                render: () => (
                  <Field orientation="horizontal" disabled className={box}>
                    <Checkbox defaultChecked />
                    <FieldLabel className="text-base text-text">Keep the original audio</FieldLabel>
                  </Field>
                ),
              },
              {
                label: "Invalid",
                note: "Required and left empty on submit. The field marks the box, and the message says what to do.",
                render: () => (
                  <Field orientation="horizontal" className={box}>
                    <Checkbox required checked={agreed} onCheckedChange={setAgreed} />
                    <FieldContent>
                      <FieldLabel className="text-base text-text">
                        I have the rights to these recordings
                      </FieldLabel>
                      <FieldError>{agreed ? undefined : "Confirm this to upload them."}</FieldError>
                    </FieldContent>
                  </Field>
                ),
              },
              {
                label: "Reduced motion",
                note: "The box does not give and the tick fades in where it is, instead of drawing across. Switch this canvas to reduced motion to try it.",
              },
            ]}
          />
        );
      },
    },
    {
      slug: "radio-group",
      name: "Radio group",
      source: "components/ui/radio-group.tsx",
      note: "One of a few choices that each need a sentence. Selection is the ring and a filled dot, both ink; the dot swells in and settles. Arrow keys move the choice, as on any radio group.",
      Demo: function RadioGroupDemo() {
        const [direction, setDirection] = useState("recognition");
        const [sort, setSort] = useState("due");
        return (
          <Variants
            items={[
              {
                label: "Rows",
                note: "RadioCard, in components/radio-card.tsx. The whole row is the target and the edge strengthens on the chosen one.",
                render: () => (
                  <RadioGroup
                    aria-label="How cards are asked"
                    value={direction}
                    onValueChange={setDirection}
                    className={box}
                  >
                    <RadioCard
                      value="recognition"
                      title="Recognition"
                      description="See the term, recall what it means."
                    />
                    <RadioCard
                      value="production"
                      title="Production"
                      description="See the meaning, recall the term."
                    />
                    <RadioCard
                      value="both"
                      title="Both ways"
                      description="Every card is asked twice."
                      disabled
                    />
                  </RadioGroup>
                ),
              },
              {
                label: "Plain",
                note: "Short labels in a FieldSet, each item a horizontal Field.",
                render: () => (
                  <FieldSet className={box}>
                    <FieldLegend variant="label">Sort cards by</FieldLegend>
                    <RadioGroup value={sort} onValueChange={setSort} className="gap-0">
                      {[
                        ["due", "When they are due"],
                        ["added", "When they were added"],
                        ["term", "Term, A to Z"],
                      ].map(([value, label]) => (
                        <Field key={value} orientation="horizontal" className="min-h-11">
                          <RadioGroupItem value={value} />
                          <FieldLabel className="text-base text-text">{label}</FieldLabel>
                        </Field>
                      ))}
                    </RadioGroup>
                  </FieldSet>
                ),
              },
              {
                label: "Hover",
                note: "A row that is not chosen takes the hover fill.",
                render: () => (
                  <RadioGroup aria-label="How cards are asked" value="recognition" className={box}>
                    <RadioCard
                      value="recognition"
                      title="Recognition"
                      description="See the term, recall what it means."
                    />
                    <Force state="hover">
                      <RadioCard
                        value="production"
                        title="Production"
                        description="See the meaning, recall the term."
                      />
                    </Force>
                  </RadioGroup>
                ),
              },
              {
                label: "Focus",
                note: "On a row the ring goes around the whole row; on a plain item, around the circle.",
                render: () => (
                  <div className={`grid gap-4 ${box}`}>
                    <RadioGroup aria-label="How cards are asked" value="recognition">
                      <Force state="focus" on="[data-slot=radio-group-item]">
                        <RadioCard
                          value="recognition"
                          title="Recognition"
                          description="See the term, recall what it means."
                        />
                      </Force>
                    </RadioGroup>
                    <RadioGroup aria-label="Sort cards by" value="due">
                      <Field orientation="horizontal" className="min-h-11">
                        <Force state="focus">
                          <RadioGroupItem value="due" />
                        </Force>
                        <FieldLabel className="text-base text-text">When they are due</FieldLabel>
                      </Field>
                    </RadioGroup>
                  </div>
                ),
              },
              {
                label: "Invalid",
                note: "Submitted with nothing chosen. Every circle takes the red edge, and the message sits under the group.",
                render: () => (
                  <FieldSet className={box}>
                    <FieldLegend variant="label">Level</FieldLegend>
                    <Field invalid>
                      <RadioGroup className="gap-0">
                        {[
                          ["a1", "Beginner"],
                          ["b1", "Intermediate"],
                        ].map(([value, label]) => (
                          <Field key={value} orientation="horizontal" className="min-h-11">
                            <RadioGroupItem value={value} />
                            <FieldLabel className="text-base text-text">{label}</FieldLabel>
                          </Field>
                        ))}
                      </RadioGroup>
                      <FieldError>Choose the level this deck is for.</FieldError>
                    </Field>
                  </FieldSet>
                ),
              },
              {
                label: "Reduced motion",
                note: "The dot fades in where it is instead of swelling past its size. Switch this canvas to reduced motion to try it.",
              },
            ]}
          />
        );
      },
    },
    {
      slug: "copy-field",
      name: "Copy field",
      source: "components/copy-field.tsx",
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

const MOTION_NOTE =
  "Switch this canvas to reduced motion, then press the box in either frame to open it again: the panel fades in place and the drawer crossfades instead of rising.";

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
        return (
          <Variants
            items={[
              {
                label: "Default",
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
                    <DeckSelect value={empty} onChange={setEmpty} />
                  </Field>
                ),
              },
              {
                label: "Hover",
                note: "The edge strengthens under a pointer.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <Force state="hover" on="[data-slot=select-trigger]">
                      <DeckSelect value={deck} onChange={setDeck} />
                    </Force>
                  </Field>
                ),
              },
              {
                label: "Focus",
                note: "The edge strengthens and the ring every control gets goes around it.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <Force state="focus" on="[data-slot=select-trigger]">
                      <DeckSelect value={deck} onChange={setDeck} />
                    </Force>
                  </Field>
                ),
              },
              {
                label: "Invalid",
                note: "Submitted without a choice. The red edge stays under hover, focus and the open list.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckSelect value={missing} onChange={setMissing} />
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
            ]}
          />
        );
      },
    },
    {
      slug: "select-open",
      name: "Open",
      source: "components/ui/select.tsx",
      note: "Two kinds of the same thing, each under a small label, with a rule between them. The hover fill never crosses the rule.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Open",
              note: "A panel under the box on a desktop. On touch the same rows in a drawer, titled with the field’s name.",
              render: () => <DeviceFrames specimen="select" />,
            },
            {
              label: "Open in a form",
              note: "On touch the list’s drawer stacks over the form’s, and the form steps back.",
              render: () => <DeviceFrames specimen="nested" />,
            },
            { label: "Reduced motion", note: MOTION_NOTE },
          ]}
        />
      ),
    },
  ],
};

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
                label: "Default",
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
                label: "Hover",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <Force state="hover" on="[data-slot=combobox-trigger]">
                      <DeckCombobox value={deck} onChange={setDeck} />
                    </Force>
                  </Field>
                ),
              },
              {
                label: "Focus",
                note: "A letter typed now opens the list with that letter already searched.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <Force state="focus" on="[data-slot=combobox-trigger]">
                      <DeckCombobox value={deck} onChange={setDeck} />
                    </Force>
                  </Field>
                ),
              },
              {
                label: "Invalid",
                note: "Submitted without a choice.",
                render: () => (
                  <Field className={box}>
                    <FieldLabel>Deck</FieldLabel>
                    <DeckCombobox value={empty} onChange={setEmpty} />
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
    {
      slug: "combobox-open",
      name: "Open",
      source: "components/ui/combobox.tsx",
      note: "Two kinds of the same thing, each under a small label, with a rule between them. A group with no match leaves with its label.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Open",
              note: "On a desktop the search field leads the panel. On touch it leads a drawer that keeps one height while the rows filter, so the drawer does not jump with each letter.",
              render: () => <DeviceFrames specimen="combobox" />,
            },
            { label: "Reduced motion", note: MOTION_NOTE },
          ]}
        />
      ),
    },
  ],
};
