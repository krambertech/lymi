import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ExampleLines } from "./example-lines";

i18n.load("en", messages);
i18n.activate("en");

async function renderSentence() {
  const onPlay = vi.fn();
  const onCard = vi.fn();
  await render(
    <I18nProvider i18n={i18n}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stands in for the review card's tap */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stands in for the review card's tap */}
      <div onClick={onCard}>
        <ExampleLines
          example="Ho prenotato un tavolo per due."
          language="it"
          translation="I booked a table for two."
          speaker={<button type="button">Play example</button>}
          speakerAfterLastWord
          onPlay={onPlay}
        />
      </div>
    </I18nProvider>,
  );
  return { onPlay, onCard, sentence: page.getByText("Ho prenotato un tavolo per due.") };
}

describe("the example sentence in review", () => {
  test("a click on the sentence plays it and stays off the card, so a touch never opens the card's menu", async () => {
    const { onPlay, onCard, sentence } = await renderSentence();
    await userEvent.click(sentence);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onCard).not.toHaveBeenCalled();
  });

  test("the second click of a double click does not play, so a quick tap after the reveal makes no clip", async () => {
    const { onPlay, sentence } = await renderSentence();
    sentence.element().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 2 }));
    expect(onPlay).not.toHaveBeenCalled();
  });

  test("a click that ends a drag selection does not play", async () => {
    const { onPlay, sentence } = await renderSentence();
    const text = sentence.element();
    window.getSelection()?.selectAllChildren(text);
    text.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(onPlay).not.toHaveBeenCalled();
    window.getSelection()?.removeAllRanges();
  });
});
