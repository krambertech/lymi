import { createRef, useRef, useState } from "react";
import { describe, expect, inject, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { z } from "zod";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../../lib/form";
import { Combobox, ComboboxTrigger, ComboboxValue } from "./combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "./field";
import { Input } from "./input";
import { Select, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";

const touch = inject("machine") === "touch";

const describedBy = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

const field = () => document.querySelector('[data-slot="field"]') as HTMLElement;

describe("Field", () => {
  test("the label names the control and the description describes it", async () => {
    await render(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input />
        <FieldDescription>So you know which key to revoke later.</FieldDescription>
      </Field>,
    );
    const input = page.getByRole("textbox", { name: "Name" });
    await expect.element(input).toBeInTheDocument();
    expect(describedBy(input.element())).toEqual(["So you know which key to revoke later."]);
    await expect.element(input).not.toHaveAttribute("aria-invalid");
    expect(field().hasAttribute("data-invalid")).toBe(false);

    await page.getByText("Name").click();
    await expect.element(input).toHaveFocus();
  });

  test("an error marks the field and its control invalid together, and leaves with its message", async () => {
    function Harness() {
      const [error, setError] = useState<string | undefined>("Give the deck a name.");
      return (
        <>
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input />
            <FieldDescription>The one field that matters.</FieldDescription>
            <FieldError>{error}</FieldError>
          </Field>
          <button type="button" onClick={() => setError(undefined)}>
            Fix
          </button>
        </>
      );
    }
    await render(<Harness />);
    const input = page.getByRole("textbox", { name: "Name" });
    await expect.element(input).toHaveAttribute("aria-invalid", "true");
    expect(field().hasAttribute("data-invalid")).toBe(true);
    // The error takes the description's place, on screen and for a screen reader.
    expect(describedBy(input.element())).toEqual(["Give the deck a name."]);
    await expect.element(page.getByText("The one field that matters.")).not.toBeInTheDocument();
    await expect.element(page.getByRole("alert")).toHaveTextContent("Give the deck a name.");

    await page.getByRole("button", { name: "Fix" }).click();
    await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
    await expect.element(input).not.toHaveAttribute("aria-invalid");
    expect(field().hasAttribute("data-invalid")).toBe(false);
    expect(describedBy(input.element())).toEqual(["The one field that matters."]);
  });

  test("`invalid` alone keeps the description, since no error has taken its place", async () => {
    await render(
      <Field invalid>
        <FieldLabel>Term</FieldLabel>
        <Input />
        <FieldDescription>What the card shows.</FieldDescription>
      </Field>,
    );
    expect(describedBy(page.getByRole("textbox", { name: "Term" }).element())).toEqual([
      "What the card shows.",
    ]);
  });

  test("an aside sits at the end of the label row, outside the control's name", async () => {
    await render(
      <>
        <Field>
          <FieldLabel aside="Optional">Meaning</FieldLabel>
          <Input />
        </Field>
        <Field>
          <FieldLabel aside={null}>Notes</FieldLabel>
          <Input />
        </Field>
      </>,
    );
    await expect
      .element(page.getByRole("textbox", { name: "Meaning", exact: true }))
      .toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="field-label-aside"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="field-label-row"]')).toHaveLength(1);
  });

  test("`invalid` marks both without a message, and an empty error changes nothing", async () => {
    await render(
      <>
        <Field invalid>
          <FieldLabel>Term</FieldLabel>
          <Input />
        </Field>
        <Field>
          <FieldLabel>Meaning</FieldLabel>
          <Input />
          <FieldError>{""}</FieldError>
          <FieldError errors={[]} />
        </Field>
      </>,
    );
    const [term, meaning] = document.querySelectorAll('[data-slot="field"]');
    await expect
      .element(page.getByRole("textbox", { name: "Term" }))
      .toHaveAttribute("aria-invalid", "true");
    expect(term?.hasAttribute("data-invalid")).toBe(true);
    await expect
      .element(page.getByRole("textbox", { name: "Meaning" }))
      .not.toHaveAttribute("aria-invalid");
    expect(meaning?.hasAttribute("data-invalid")).toBe(false);
    expect(page.getByRole("alert").elements()).toHaveLength(0);
  });

  test("the Field decides invalid, so a control inside cannot disagree with it", async () => {
    await render(
      <Field>
        <FieldLabel>Term</FieldLabel>
        <Input aria-invalid />
      </Field>,
    );
    await expect
      .element(page.getByRole("textbox", { name: "Term" }))
      .not.toHaveAttribute("aria-invalid");
  });

  test("issues from a form library show each message once", async () => {
    await render(
      <>
        <Field>
          <FieldLabel>Tag</FieldLabel>
          <Input />
          <FieldError
            errors={[
              { message: "Use a language tag like ca, pt-BR or zh-Hant." },
              undefined,
              { message: "Keep the language tag under 12 characters." },
              { message: "Use a language tag like ca, pt-BR or zh-Hant." },
            ]}
          />
        </Field>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input />
          <FieldError errors={[{ message: "Give the deck a name." }]} />
        </Field>
      </>,
    );
    const [tag, name] = page.getByRole("alert").elements();
    expect(
      [...(tag?.querySelectorAll(":scope > div") ?? [])].map((line) => line.textContent),
    ).toEqual([
      "Use a language tag like ca, pt-BR or zh-Hant.",
      "Keep the language tag under 12 characters.",
    ]);
    expect(name?.querySelectorAll(":scope > div")).toHaveLength(1);
    await expect
      .element(page.getByRole("textbox", { name: "Name" }))
      .toHaveAttribute("aria-invalid", "true");
  });

  test("a control's own id and description are kept, and the label follows the id", async () => {
    await render(
      <>
        <p id="outside">Shown beside the form.</p>
        <Field>
          <FieldLabel>Term</FieldLabel>
          <Input id="term" aria-describedby="outside" />
          <FieldDescription>What the card shows.</FieldDescription>
        </Field>
      </>,
    );
    const input = page.getByRole("textbox", { name: "Term" });
    await expect.element(input).toHaveAttribute("id", "term");
    expect(describedBy(input.element())).toEqual([
      "Shown beside the form.",
      "What the card shows.",
    ]);
  });

  test("disabled on the Field reaches every kind of control", async () => {
    await render(
      <FieldGroup>
        <Field disabled>
          <FieldLabel>Input</FieldLabel>
          <Input />
        </Field>
        <Field disabled>
          <FieldLabel>Textarea</FieldLabel>
          <Textarea />
        </Field>
        <Field disabled>
          <FieldLabel>Select</FieldLabel>
          <Select items={[{ value: "a", label: "A" }]}>
            <SelectTrigger>
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
          </Select>
        </Field>
        <Field disabled>
          <FieldLabel>Combobox</FieldLabel>
          <Combobox items={["a"]}>
            <ComboboxTrigger>
              <ComboboxValue placeholder="Choose one" />
            </ComboboxTrigger>
          </Combobox>
        </Field>
      </FieldGroup>,
    );
    await expect.element(page.getByRole("textbox", { name: "Input" })).toBeDisabled();
    await expect.element(page.getByRole("textbox", { name: "Textarea" })).toBeDisabled();
    await expect.element(page.getByRole("combobox", { name: "Select" })).toBeDisabled();
    await expect.element(page.getByRole("combobox", { name: "Combobox" })).toBeDisabled();
    for (const el of document.querySelectorAll('[data-slot="field"]')) {
      expect(el.hasAttribute("data-disabled")).toBe(true);
    }
  });

  test("Select and Combobox boxes take the Field's name and invalid state", async () => {
    await render(
      <>
        <Field>
          <FieldLabel>Deck</FieldLabel>
          <Select items={[{ value: "a", label: "A" }]}>
            <SelectTrigger>
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
          </Select>
          <FieldError>Choose a deck for this card.</FieldError>
        </Field>
        <Field>
          <FieldLabel>Language</FieldLabel>
          <Combobox items={["it"]}>
            <ComboboxTrigger>
              <ComboboxValue placeholder="Choose one" />
            </ComboboxTrigger>
          </Combobox>
          <FieldError>Use a language tag like ca, pt-BR or zh-Hant.</FieldError>
        </Field>
      </>,
    );
    for (const name of ["Deck", "Language"]) {
      const box = page.getByRole("combobox", { name, exact: true });
      await expect.element(box).toHaveAttribute("aria-invalid", "true");
      const group = box.element().closest('[data-slot="field"]');
      expect(group?.hasAttribute("data-invalid")).toBe(true);
    }
  });

  test("a horizontal field keeps its label beside the control and the description under it", async () => {
    await render(
      <div className="w-96">
        <Field orientation="horizontal">
          <FieldLabel className="w-20 shrink-0">Persona</FieldLabel>
          <FieldContent>
            <Input />
            <FieldDescription>Forty cards, two decks.</FieldDescription>
          </FieldContent>
        </Field>
      </div>,
    );
    const input = page.getByRole("textbox", { name: "Persona" });
    expect(describedBy(input.element())).toEqual(["Forty cards, two decks."]);
    const label = page.getByText("Persona").element().getBoundingClientRect();
    const box = input.element().getBoundingClientRect();
    const description = page.getByText("Forty cards, two decks.").element().getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(label.right);
    expect(description.top).toBeGreaterThanOrEqual(box.bottom);
    expect(field().getAttribute("data-orientation")).toBe("horizontal");
  });
});

describe("FieldSet", () => {
  test("the legend names the group and a description outside a field describes the set", async () => {
    await render(
      <FieldSet>
        <FieldLegend>Card</FieldLegend>
        <FieldDescription>What you type here is what the card shows.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel>Term</FieldLabel>
            <Input />
            <FieldDescription>The word itself.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>,
    );
    const group = page.getByRole("group", { name: "Card" });
    await expect.element(group).toBeInTheDocument();
    expect(describedBy(group.element())).toEqual(["What you type here is what the card shows."]);
    expect(describedBy(page.getByRole("textbox", { name: "Term" }).element())).toEqual([
      "The word itself.",
    ]);
  });
});

describe("controls", () => {
  test("pass refs and native props through, and stand alone without a Field", async () => {
    const input = createRef<HTMLInputElement>();
    const textarea = createRef<HTMLTextAreaElement>();
    await render(
      <>
        <Input
          ref={input}
          aria-label="Reviews a day"
          aria-invalid
          type="number"
          inputMode="numeric"
          name="goal"
          maxLength={3}
        />
        <Textarea
          ref={textarea}
          aria-label="Notes"
          rows={2}
          placeholder="Anything to remember it by"
        />
      </>,
    );
    expect(input.current?.type).toBe("number");
    expect(input.current?.name).toBe("goal");
    expect(input.current?.getAttribute("aria-invalid")).toBe("true");
    expect(input.current?.id).toBe("");
    expect(textarea.current?.rows).toBe(2);
  });

  test.runIf(touch)(
    "text stays 16 px on touch screens, a tablet included, so iOS does not zoom",
    async () => {
      await render(
        <>
          <Input aria-label="Input" />
          <Textarea aria-label="Textarea" />
          <Field>
            <FieldLabel>Deck</FieldLabel>
            <Select items={[{ value: "a", label: "A" }]}>
              <SelectTrigger>
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
            </Select>
          </Field>
        </>,
      );
      const sizes = () =>
        ["textbox", "combobox"].flatMap((role) =>
          page
            .getByRole(role as "textbox")
            .elements()
            .map((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
        );
      expect(sizes()).toHaveLength(3);
      for (const size of sizes()) expect(size).toBeGreaterThanOrEqual(16);
      await page.viewport(1024, 768);
      try {
        for (const size of sizes()) expect(size).toBeGreaterThanOrEqual(16);
      } finally {
        await page.viewport(390, 844);
      }
    },
  );
});

describe("forms", () => {
  test("a submit that fails the schema moves the caret to the first invalid field", async () => {
    const Schema = z.object({ term: z.string().min(1), meaning: z.string().max(5) });
    function Form() {
      const ref = useRef<HTMLFormElement>(null);
      const [term, setTerm] = useState("");
      const [meaning, setMeaning] = useState("");
      const [invalid, setInvalid] = useState<FieldErrors>({});
      return (
        <form
          ref={ref}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = Schema.safeParse({ term, meaning });
            if (parsed.success) return setInvalid({});
            setInvalid(
              fieldErrors(parsed.error, {
                term: "Type the term.",
                meaning: "Keep the meaning under 5 characters.",
              }),
            );
            focusFirstInvalid(ref.current);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Other</FieldLabel>
              <Input />
            </Field>
            <Field>
              <FieldLabel>Term</FieldLabel>
              <Input value={term} onChange={(e) => setTerm(e.target.value)} />
              <FieldError>{invalid.term}</FieldError>
            </Field>
            <Field>
              <FieldLabel>Meaning</FieldLabel>
              <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} />
              <FieldError>{invalid.meaning}</FieldError>
            </Field>
          </FieldGroup>
          <button type="submit">Add</button>
        </form>
      );
    }
    await render(<Form />);
    await page.getByRole("textbox", { name: "Meaning" }).fill("too long");
    await page.getByRole("button", { name: "Add" }).click();
    await expect.element(page.getByRole("textbox", { name: "Term" })).toHaveFocus();
    expect(
      page
        .getByRole("alert")
        .elements()
        .map((el) => el.textContent),
    ).toEqual(["Type the term.", "Keep the meaning under 5 characters."]);
    await expect
      .element(page.getByRole("textbox", { name: "Other" }))
      .not.toHaveAttribute("aria-invalid");
  });
});

describe("the invalid edge", () => {
  test("stays red under the pointer and the keyboard", async () => {
    await render(
      <FieldGroup className="m-12 w-80">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input />
          <FieldError>Give the deck a name.</FieldError>
        </Field>
        <Field>
          <FieldLabel>Notes</FieldLabel>
          <Textarea />
          <FieldError>Keep the notes under 500 characters.</FieldError>
        </Field>
        <Field>
          <FieldLabel>Deck</FieldLabel>
          <Select items={[{ value: "a", label: "A" }]}>
            <SelectTrigger>
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
          </Select>
          <FieldError>Choose a deck for this card.</FieldError>
        </Field>
      </FieldGroup>,
    );
    const controls = [
      page.getByRole("textbox", { name: "Name" }),
      page.getByRole("textbox", { name: "Notes" }),
      page.getByRole("combobox", { name: "Deck" }),
    ];
    const edge = (el: Element) => getComputedStyle(el).boxShadow;
    const resting = edge(page.getByRole("textbox", { name: "Name" }).element());
    expect(resting).not.toBe("none");
    for (const control of controls) {
      const el = control.element() as HTMLElement;
      expect(edge(el)).toBe(resting);
      if (!touch) {
        await userEvent.hover(el);
        // Past the 150 ms transition, so a lost edge would have finished changing.
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(edge(el)).toBe(resting);
      }
      el.focus();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(edge(el)).toBe(resting);
    }
  });
});
