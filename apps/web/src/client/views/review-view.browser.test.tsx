import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import type { FixOfferProps } from "../components/fix-offer";
import { aidSteps } from "../components/recall-aid";
import { queueItem, queueItemPicture } from "../design/mock";
import type { QueueItem } from "../lib/api";
import { GradeBar, ReviewCard } from "./review-view";

i18n.load("en", messages);
i18n.activate("en");

const noop = () => {};
const item = (card: Partial<QueueItem["card"]>): QueueItem => ({
  ...queueItem,
  card: { ...queueItem.card, ...card },
});

test("a revealed card shows its source, not its tags, and marks only what the AI wrote", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={item({
          meaningSource: "ai",
          exampleSource: "lesson",
          source: "Lesson 14",
          tags: ["verbs", "reflexive"],
        })}
        revealed
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>,
  );

  expect(page.getByRole("list", { name: "Tags" }).elements()).toHaveLength(0);
  const card = page.getByRole("region", { name: /Recognition card/ }).element();
  expect(card.textContent).toContain("AI meaning");
  expect(card.textContent).toContain("Lesson 14");
  expect(card.textContent).not.toContain("verbs");
  expect(card.textContent).not.toContain("from lesson");
  expect(card.textContent).not.toContain("by you");
});

test("the learner's own text and no source carry no chip", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={item({ meaningSource: "manual", exampleSource: "manual", source: null, tags: [] })}
        revealed
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>,
  );

  const card = page.getByRole("region", { name: /Recognition card/ }).element();
  expect(card.textContent).not.toContain("by you");
  expect(card.textContent).not.toContain("AI");
  expect(card.querySelectorAll(".rounded-full")).toHaveLength(1);
});

test("the head names the deck and the section, and the mode only for a picture", async () => {
  // The picture loads through Query, so the picture card needs a client.
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <ReviewCard
          item={item({ language: "it" })}
          deck={{ name: "Verbi", language: "it" }}
          section="Lezione 3"
          revealed={false}
          onReveal={noop}
        />
        <ReviewCard
          item={{ ...queueItemPicture, card: { ...queueItemPicture.card, language: "et" } }}
          deck={{ name: "Driving", language: "it" }}
          revealed={false}
          onReveal={noop}
        />
      </I18nProvider>
    </QueryClientProvider>,
  );

  const text = page.getByRole("region", { name: /Recognition card/ }).element().textContent ?? "";
  expect(text).toContain("Verbi");
  expect(text).toContain("Section");
  expect(text).toContain("Lezione 3");
  expect(text).not.toContain("Recognition card");
  expect(text).not.toMatch(/Recognition(?! card)|Production/);

  const picture = page.getByRole("region", { name: "Picture card" }).element().textContent ?? "";
  expect(picture).toContain("Picture → meaning");
  expect(picture).toContain("ET");
});

test("a drafted fix waits for the reveal, then opens from the foot of the card", async () => {
  const opened = vi.fn();
  const shown = vi.fn();
  const offer: FixOfferProps = {
    offer: {
      diagnosisId: "d1",
      cause: "confused_pair",
      other: { id: "c2", term: "sbagliare", meaning: null, language: "it" },
      draft: {
        otherCardId: "c2",
        cards: [
          { term: "a", meaning: "b" },
          { term: "c", meaning: "d" },
        ],
      },
    },
    delay: 0,
    animate: false,
    parked: false,
    onOpen: opened,
    onShown: shown,
  };
  const screen = await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard item={item({})} revealed={false} onReveal={noop} offer={offer} />
    </I18nProvider>,
  );
  expect(page.getByRole("button", { name: /Often mixed up with/ }).elements()).toHaveLength(0);

  await screen.rerender(
    <I18nProvider i18n={i18n}>
      <ReviewCard item={item({})} revealed animateReveal={false} onReveal={noop} offer={offer} />
    </I18nProvider>,
  );
  const button = page.getByRole("button", { name: /Often mixed up with sbagliare/ });
  await expect.element(button).toBeVisible();
  await expect.poll(() => shown.mock.calls.length).toBeGreaterThan(0);
  await button.click();
  expect(opened).toHaveBeenCalled();
});

const hooked = item({ hook: "Speed up the brigade", hookSource: "ai", notes: "Reflexive." });

/** A card as review holds it: the aid steps taken live in the page, the card only draws them. */
function PeekHarness({
  card,
  onReveal,
  revealed = false,
  onShow = noop,
}: {
  card: QueueItem;
  onReveal: () => void;
  revealed?: boolean;
  onShow?: () => void;
}) {
  const [taken, setTaken] = useState(0);
  const [shown, setShown] = useState(false);
  const steps = aidSteps(card.card);
  return (
    <I18nProvider i18n={i18n}>
      {/* A stage of fixed height, as review gives the card, so the reveal is not a new size to fit. */}
      <div className="flex h-[640px] flex-col">
        <ReviewCard
          item={card}
          revealed={revealed}
          animateReveal={false}
          onReveal={onReveal}
          aid={
            steps.length
              ? {
                  steps,
                  taken,
                  shown,
                  animate: false,
                  onTake: () => setTaken((n) => Math.min(n + 1, steps.length)),
                  onShow: () => {
                    onShow();
                    setShown(true);
                  },
                }
              : undefined
          }
        />
      </div>
    </I18nProvider>
  );
}

const visible = (text: string) => () =>
  page
    .getByText(text, { exact: false })
    .elements()
    // The status line says it aloud too; this is what is drawn.
    .filter(
      (el) => el.checkVisibility({ visibilityProperty: true }) && !el.closest("[role=status]"),
    );

test("a peek shows the hook under the cue and says it aloud, without turning the card", async () => {
  const onReveal = vi.fn();
  await render(<PeekHarness card={hooked} onReveal={onReveal} />);
  const card = page.getByRole("region", { name: /Recognition card/ });
  const status = card.getByRole("status");
  await expect.element(status).toHaveTextContent("");

  await card.getByRole("button", { name: /Peek at your hook/ }).click();
  await expect.element(status).toHaveTextContent("Memory hook: Speed up the brigade");
  expect(onReveal).not.toHaveBeenCalled();
  // The measuring copy holds the hook too, hidden; the peeked one is on show.
  await expect.poll(() => visible("Speed up the brigade")().length).toBe(1);
  // One step and it is taken, so nothing is left to press.
  expect(card.getByRole("button", { name: /Peek at your hook/ }).elements()).toHaveLength(0);
});

test("a peeked hook stays in its place under the cue through the reveal", async () => {
  const card = hooked;
  const { rerender } = await render(<PeekHarness card={card} onReveal={noop} />);
  await page.getByRole("button", { name: /Peek at your hook/ }).click();
  await expect.poll(() => visible("Speed up the brigade")().length).toBe(1);
  const cue = page.getByText("sbrigarsi", { exact: true }).element();
  const [hook] = visible("Speed up the brigade")();
  if (!hook) throw new Error("no hook on show");
  const offset = () => hook.getBoundingClientRect().top - cue.getBoundingClientRect().top;
  const before = offset();

  await rerender(<PeekHarness card={card} onReveal={noop} revealed />);
  await expect.element(page.getByText("Reflexive.")).toBeVisible();
  // The same line, not a second copy among the notes, at the same distance from the cue.
  expect(hook.isConnected).toBe(true);
  expect(visible("Speed up the brigade")()).toEqual([hook]);
  expect(offset()).toBe(before);
  const notes = page.getByText("Reflexive.").element();
  expect(hook.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(page.getByRole("button", { name: /Show hook/ }).elements()).toHaveLength(0);
});

test("revealed without a peek, the hook waits for Show hook, which puts it under the cue", async () => {
  const onShow = vi.fn();
  await render(<PeekHarness card={hooked} onReveal={noop} revealed onShow={onShow} />);
  const card = page.getByRole("region", { name: /Recognition card/ });
  await expect.poll(() => card.getByRole("status").element().textContent).toMatch(/^Answer:/);
  expect(visible("Speed up the brigade")()).toHaveLength(0);

  const show = card.getByRole("button", { name: /Show hook/ });
  await expect.element(show).toBeVisible();
  // The control stands in the hook's place: after the cue, before the rule and the answer.
  const cue = page.getByText("sbrigarsi", { exact: true }).element();
  const notes = page.getByText("Reflexive.").element();
  expect(
    cue.compareDocumentPosition(show.element()) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    show.element().compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  await show.click();
  expect(onShow).toHaveBeenCalledOnce();
  await expect.poll(() => visible("Speed up the brigade")().length).toBe(1);
  await expect
    .element(card.getByRole("status"))
    .toHaveTextContent("Memory hook: Speed up the brigade");
  expect(card.getByRole("button", { name: /Show hook/ }).elements()).toHaveLength(0);
  expect(card.element().textContent).toContain("AI hook");
});

test("a quick second tap on the peek does not turn the card", async () => {
  const onReveal = vi.fn();
  await render(<PeekHarness card={hooked} onReveal={onReveal} />);
  const card = page.getByRole("region", { name: /Recognition card/ });
  await card.getByRole("button", { name: /Peek at your hook/ }).dblClick();
  await expect
    .element(card.getByRole("status"))
    .toHaveTextContent("Memory hook: Speed up the brigade");
  expect(onReveal).not.toHaveBeenCalled();
});

test("a card without a hook has no peek control, and none after the reveal", async () => {
  const bare = item({ hook: null, hookSource: null });
  const { rerender } = await render(<PeekHarness card={bare} onReveal={noop} />);
  await expect.element(page.getByRole("button", { name: "Reveal the card" })).toBeInTheDocument();
  expect(page.getByRole("button", { name: /Peek at your hook/ }).elements()).toHaveLength(0);
  await rerender(<PeekHarness card={bare} onReveal={noop} revealed />);
  await expect.poll(() => page.getByRole("status").element().textContent).toMatch(/^Answer:/);
  expect(page.getByRole("button", { name: /Show hook/ }).elements()).toHaveLength(0);
});

const WHY = "You can’t choose Easy after peeking at your hook.";

test("after a peek Easy keeps its slot, locked: a press says why and grades nothing", async () => {
  const onGrade = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      <GradeBar revealed aid="hook" onGrade={onGrade} />
    </I18nProvider>,
  );
  const easy = page.getByRole("button", { name: "Easy, locked" });
  await expect.element(easy).toHaveAttribute("aria-disabled", "true");
  await expect.element(easy).toHaveAccessibleDescription(WHY);
  // Forced, because Playwright rightly waits forever on a control marked unavailable.
  await easy.click({ force: true });
  await expect.element(page.getByRole("status").filter({ hasText: WHY })).toBeInTheDocument();
  expect(onGrade).not.toHaveBeenCalled();
  await page.getByRole("button", { name: "Good" }).click();
  expect(onGrade).toHaveBeenCalledWith(3);
  const buttons = page
    .getByRole("group", { name: "Choose a recall grade" })
    .getByRole("button")
    .elements();
  expect(buttons).toHaveLength(4);
  expect(buttons[3]?.getAttribute("aria-label")).toBe("Easy, locked");
});

test("Easy's key after a peek shows the same reason, but not one pressed on an earlier card", async () => {
  const bar = (nudge: number) => (
    <I18nProvider i18n={i18n}>
      <GradeBar revealed aid="hook" lockedNudge={nudge} onGrade={noop} />
    </I18nProvider>
  );
  const { rerender } = await render(bar(3));
  const status = page.getByRole("status").filter({ hasText: WHY });
  expect(status.elements()).toHaveLength(0);
  await rerender(bar(4));
  await expect.element(status).toBeInTheDocument();
});
