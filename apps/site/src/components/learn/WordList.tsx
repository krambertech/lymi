import { useLingui } from "@lingui/react/macro";
import { clipId, clipUrl } from "../../lib/learn/clips";
import { ListenRows } from "./Explore";
import { useLesson } from "./lesson-context";

/** The words worth keeping from a lesson, each one to hear. */
export function WordList({ words, bare }: { words: readonly string[]; bare?: boolean }) {
  const { i18n } = useLingui();
  const { slug, glossary } = useLesson();
  return (
    <ListenRows
      bare={bare}
      items={words.map((word) => {
        const gloss = glossary[word];
        const show = gloss?.show ?? word;
        const clip = gloss?.clip === false ? null : (gloss?.clip ?? clipId(word));
        return {
          main: show,
          sub: gloss ? i18n._(gloss.en) : undefined,
          src: clip ? clipUrl(slug, clip) : null,
        };
      })}
    />
  );
}
