import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { knownReadings } from "@lymi/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { HookOffer, type HookOfferProps } from "../components/hook-offer";
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
  expect(card.textContent).toContain("AI wrote part of this card");
  expect(card.textContent).toContain("Lesson 14");
  expect(card.textContent).not.toContain("verbs");
  expect(card.textContent).not.toContain("from lesson");
  expect(card.textContent).not.toContain("by you");
});

test("several AI-written fields share one AI chip", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={item({
          meaningSource: "ai",
          example: "Meie maja on madal.",
          exampleSource: "ai",
          pronunciation: "ˈmeie ˈmaja",
          pronunciationSource: "ai",
        })}
        revealed
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>,
  );

  expect(page.getByText("AI wrote part of this card").elements()).toHaveLength(1);
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
  // The state chip alone; round speakers are buttons, not chips.
  expect(card.querySelectorAll(".rounded-full:not(button)")).toHaveLength(1);
});

test("a revealed card names its section in place of its source", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={item({ source: "Lesson 14 · Verbs and more" })}
        section="Lezione 3"
        revealed
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>,
  );

  const card = page.getByRole("region", { name: /Recognition card/ }).element();
  expect(card.textContent).toContain("Section");
  expect(card.textContent).toContain("Lezione 3");
  expect(card.textContent).not.toContain("Lesson 14");
});

test("a pronunciation that loads shows the spinner at once", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={item({ language: "et" })}
        revealed={false}
        onReveal={noop}
        onPlayAudio={noop}
        audioState="loading"
      />
    </I18nProvider>,
  );

  const button = page.getByRole("button", { name: "Play pronunciation" });
  await expect.element(button).toHaveAttribute("aria-disabled", "true");
  expect(button.element().querySelector(".animate-spin")).not.toBeNull();
});

// The hidden copy that sizes the card holds the answer before the reveal, so look at what shows.
const shown = (text: string) =>
  page
    .getByText(text, { exact: true })
    .elements()
    .filter((el) => !el.closest("[aria-hidden='true']") && el.checkVisibility());

async function reviewCue(card: Partial<QueueItem["card"]>, fsrsState: number) {
  const cue = (revealed: boolean) => (
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={{ ...item(card), fsrsState }}
        revealed={revealed}
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>
  );
  const screen = await render(cue(false));
  return { reveal: () => screen.rerender(cue(true)) };
}

// Pinyin drawn over the cue's characters, outside the hidden copy that sizes the card.
const pinyinShown = () =>
  [...document.querySelectorAll("rt")]
    .filter(
      (rt) =>
        !rt.parentElement?.closest("[aria-hidden='true']") &&
        rt.checkVisibility({ visibilityProperty: true }),
    )
    .map((rt) => rt.textContent);

const pinyinLine = () => shown("xuéxí").filter((el) => !el.classList.contains("sr-only"));

test("a Known Chinese card's pinyin waits over the term for the reveal", async () => {
  const { reveal } = await reviewCue({ term: "学习", language: "zh", pronunciation: "xuéxí" }, 2);
  expect(pinyinShown()).toEqual([]);
  await reveal();
  await expect.poll(pinyinShown).toEqual(["xué", "xí"]);
  // Drawn over the term, so only the screen reader's line repeats it.
  expect(pinyinLine()).toHaveLength(0);
});

test("a New or Learning Chinese card draws its pinyin over each character on the cue", async () => {
  const { reveal } = await reviewCue({ term: "学习", language: "zh", pronunciation: "xuéxí" }, 1);
  expect(pinyinShown()).toEqual(["xué", "xí"]);
  expect(pinyinLine()).toHaveLength(0);
  await reveal();
  await expect.poll(() => shown("to hurry up, to get a move on")).toHaveLength(1);
  expect(pinyinShown()).toEqual(["xué", "xí"]);
});

test("一点儿 gives 儿 to the erhua syllable before it", async () => {
  await reviewCue({ term: "一点儿", language: "zh", pronunciation: "yì diǎnr" }, 0);
  expect(pinyinShown()).toEqual(["yì", "diǎnr"]);
  const ruby = [...document.querySelectorAll("ruby")].find((el) =>
    el.textContent?.includes("diǎnr"),
  );
  expect(ruby?.firstChild?.textContent).toBe("点儿");
});

test("a traditional Chinese card draws pinyin over its characters", async () => {
  await reviewCue({ term: "學習", language: "zh-TW", pronunciation: "xué xí" }, 0);
  expect(pinyinShown()).toEqual(["xué", "xí"]);
});

// A stress mark is drawn in place, so the marked and plain terms are each whole text.
const drawn = (text: string) => shown(text).filter((el) => !el.classList.contains("sr-only"));
const spoken = (text: string) =>
  [...document.querySelectorAll(".sr-only")].filter((el) => el.textContent === text);

test("a New or Learning Russian card draws its stress in place on the cue", async () => {
  const { reveal } = await reviewCue({ term: "замок", language: "ru", pronunciation: "замо́к" }, 1);
  expect(drawn("замо́к")).toHaveLength(1);
  expect(drawn("замок")).toHaveLength(0);
  expect(spoken("замо́к")).toHaveLength(0);
  await reveal();
  await expect.poll(() => shown("to hurry up, to get a move on")).toHaveLength(1);
  // The cue already shows the stress, so no line under the answer repeats it.
  expect(drawn("замо́к")).toHaveLength(1);
  // The marks are the term's own text, so a screen reader hears them once too.
  expect(spoken("замо́к")).toHaveLength(0);
});

test("a Known Russian card's cue is the plain term until the reveal", async () => {
  const { reveal } = await reviewCue({ term: "замок", language: "ru", pronunciation: "за́мок" }, 2);
  expect(drawn("замок")).toHaveLength(1);
  expect(drawn("за́мок")).toHaveLength(0);
  await reveal();
  await expect.poll(() => drawn("за́мок")).toHaveLength(1);
  expect(drawn("замок")).toHaveLength(0);
});

test("another language's reading waits for the reveal, even on a New card", async () => {
  const { reveal } = await reviewCue({ term: "학교", language: "ko", pronunciation: "학꾜" }, 0);
  expect(shown("학꾜")).toHaveLength(0);
  await reveal();
  await expect.poll(() => shown("학꾜")).toHaveLength(1);
});

test("a relearning card under review says Forgotten", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <ReviewCard item={{ ...queueItem, fsrsState: 3 }} revealed={false} onReveal={noop} />
    </I18nProvider>,
  );

  const text = page.getByRole("region", { name: /Recognition card/ }).element().textContent ?? "";
  expect(text).toContain("Forgotten");
  expect(text).not.toContain("recently");
});

test("a Japanese cue draws furigana until the card is Known, keeps its room, and always after the reveal", async () => {
  const japanese = (fsrsState: number): QueueItem => ({
    ...queueItem,
    fsrsState,
    card: {
      ...queueItem.card,
      term: "食べる",
      language: "ja",
      pronunciation: "たべる",
      example: "毎朝[まいあさ]パンを食[た]べます。",
    },
  });
  const cue = () =>
    page
      .getByRole("region", { name: /Recognition card/ })
      .element()
      .querySelector("p[lang]");
  const reading = () => cue()?.querySelector("rt") as HTMLElement;
  const shown = (rt: HTMLElement) => getComputedStyle(rt).visibility === "visible";
  const card = (fsrsState: number, revealed: boolean) => (
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={japanese(fsrsState)}
        revealed={revealed}
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>
  );

  const fresh = await render(card(0, false));
  expect(reading().textContent).toBe("た");
  expect(shown(reading())).toBe(true);
  // The parentheses are the fallback for a browser without ruby.
  expect(cue()?.textContent).toBe("食(た)べる");
  const height = cue()?.getBoundingClientRect().height;

  await fresh.rerender(card(1, false));
  expect(shown(reading())).toBe(true);

  await fresh.rerender(card(2, false));
  await expect.poll(() => shown(reading())).toBe(false);
  expect(cue()?.getBoundingClientRect().height).toBe(height);
  // Nothing a learner or a screen reader can reach says the reading either; the hidden copy that
  // sizes the card holds the answer.
  const said = page
    .getByText("たべる", { exact: true })
    .elements()
    .filter((el) => !el.closest("[aria-hidden='true']"));
  expect(said).toHaveLength(0);

  await fresh.rerender(card(2, true));
  await expect.poll(() => shown(reading())).toBe(true);
  const example = [...document.querySelectorAll("rt")].map((rt) => rt.textContent);
  expect(example).toEqual(expect.arrayContaining(["まいあさ", "た"]));
});

test("an example's reading fades over a Known word and keeps its room", async () => {
  const japanese: QueueItem = {
    ...queueItem,
    fsrsState: 2,
    card: {
      ...queueItem.card,
      term: "毎朝",
      language: "ja",
      pronunciation: "まいあさ",
      example: "毎朝[まいあさ]パンを食[た]べます。食事[しょくじ]も。",
    },
  };
  const known = knownReadings([
    { term: "食べる", pronunciation: "たべる", language: "ja", known: true },
  ]);
  const example = () =>
    [
      ...page
        .getByText(/パンを/)
        .element()
        .querySelectorAll("rt"),
    ].map((rt) => ({
      reading: rt.textContent,
      shown: getComputedStyle(rt).visibility === "visible",
    }));
  const card = (knownReadings?: typeof known) => (
    <I18nProvider i18n={i18n}>
      <ReviewCard
        item={japanese}
        knownReadings={knownReadings}
        revealed
        animateReveal={false}
        onReveal={noop}
      />
    </I18nProvider>
  );
  const shown = await render(card());
  const height = page
    .getByText(/パンを/)
    .element()
    .getBoundingClientRect().height;
  await shown.rerender(card(known));
  await expect.poll(example).toEqual([
    { reading: "まいあさ", shown: true },
    { reading: "た", shown: false },
    { reading: "しょくじ", shown: true },
  ]);
  expect(
    page
      .getByText(/パンを/)
      .element()
      .getBoundingClientRect().height,
  ).toBe(height);
});

test("the head names the deck alone, and the mode only for a picture", async () => {
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
  // A lesson's topic is a hint, so the section waits for the answer; the hidden answer is in the DOM.
  const head = page.getByText("Verbi").element().parentElement?.parentElement;
  expect(head?.textContent).toBe("VerbiNew");
  expect(text).not.toContain("Recognition card");
  expect(text).not.toMatch(/Recognition(?! card)|Production/);

  const picture = page.getByRole("region", { name: "Picture card" }).element().textContent ?? "";
  expect(picture).toContain("Picture → meaning");
  expect(picture).toContain("ET");
});

test("the hook offer waits for the reveal, then opens from the foot of the card", async () => {
  const opened = vi.fn();
  const shown = vi.fn();
  const offer: HookOfferProps = {
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
  expect(page.getByRole("button", { name: /Try a memory hook/ }).elements()).toHaveLength(0);

  await screen.rerender(
    <I18nProvider i18n={i18n}>
      <ReviewCard item={item({})} revealed animateReveal={false} onReveal={noop} offer={offer} />
    </I18nProvider>,
  );
  const button = page.getByRole("button", { name: /Try a memory hook/ });
  await expect.element(button).toBeVisible();
  await expect.poll(() => shown.mock.calls.length).toBeGreaterThan(0);
  // A screen reader hears of it once it can be seen.
  await expect
    .poll(() => page.getByRole("status").element().textContent)
    .toContain("You can add a memory hook.");
  await button.click();
  expect(opened).toHaveBeenCalled();
});

test("a tap where the offer will be, before it has arrived, opens nothing", async () => {
  const opened = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      <HookOffer delay={60} animate parked={false} onOpen={opened} onShown={noop} />
    </I18nProvider>,
  );
  const offer = page.getByRole("button", { name: /Try a memory hook/, includeHidden: true });
  await expect.element(offer).toHaveAttribute("inert");
  // Forced, because Playwright rightly waits on an inert control; the tap still lands where it is.
  await offer.click({ force: true });
  expect(opened).not.toHaveBeenCalled();
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

test("Show hook cannot be pressed until it has arrived, so a doubled reveal tap shows nothing", async () => {
  const onShow = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      <div className="flex h-[640px] flex-col">
        <ReviewCard
          item={hooked}
          revealed
          animateReveal
          onReveal={noop}
          aid={{
            steps: aidSteps(hooked.card),
            taken: 0,
            shown: false,
            animate: true,
            onTake: noop,
            onShow,
          }}
        />
      </div>
    </I18nProvider>,
  );
  // Read at once rather than racing a click against the short arrival.
  const arriving = document.querySelector("[data-aid]")?.closest("[inert]");
  expect(arriving).toBeInstanceOf(HTMLElement);
  expect(arriving?.classList.contains("pointer-events-none")).toBe(true);
  await expect.poll(() => document.querySelector("[data-aid]")?.closest("[inert]")).toBeNull();
  expect(onShow).not.toHaveBeenCalled();
  await page.getByRole("button", { name: /Show hook/ }).click();
  expect(onShow).toHaveBeenCalledTimes(1);
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
  // A click leaves focus on the grades, where the review's keys still reach.
  await expect.element(page.getByRole("group", { name: "Choose a recall grade" })).toHaveFocus();
  await page.getByRole("button", { name: "Good" }).click();
  expect(onGrade).toHaveBeenCalledWith(3);
  const buttons = page
    .getByRole("group", { name: "Choose a recall grade" })
    .getByRole("button")
    .elements();
  expect(buttons).toHaveLength(4);
  expect(buttons[3]?.getAttribute("aria-label")).toBe("Easy, locked");
});

test("Easy's key after a peek shows the same reason each time it is pressed", async () => {
  const bar = (nudge: number) => (
    <I18nProvider i18n={i18n}>
      <GradeBar revealed aid="hook" lockedNudge={nudge} onGrade={noop} />
    </I18nProvider>
  );
  const { rerender } = await render(bar(0));
  const status = page.getByRole("status").filter({ hasText: WHY });
  expect(status.elements()).toHaveLength(0);
  await rerender(bar(1));
  await expect.element(status).toBeInTheDocument();
});

test("the hover tooltip stands aside while the tip says why", async () => {
  await render(
    <I18nProvider i18n={i18n}>
      <GradeBar revealed aid="hook" onGrade={noop} />
    </I18nProvider>,
  );
  const easy = page.getByRole("button", { name: "Easy, locked" });
  const tooltip = () => document.querySelector('[data-slot="tooltip-content"]');
  await easy.hover();
  await expect.poll(tooltip).not.toBeNull();
  await easy.click({ force: true });
  await expect.poll(() => document.querySelector('[data-slot="popover-content"]')).not.toBeNull();
  await expect.poll(tooltip).toBeNull();
});
