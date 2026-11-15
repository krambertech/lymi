import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { trayStyle } from "../../lib/tray";
import { BENTO_HUES } from "./LanguageBento";
import { Section } from "./Section";
import { LANGUAGE_LINKS, linksIn } from "./site-links";

/** Each language's name in itself; data, so never translated. */
const ENDONYMS: Record<string, string> = {
  ja: "日本語",
  zh: "中文",
  uk: "Українська",
  ru: "Русский",
  pl: "Polski",
  es: "Español",
  de: "Deutsch",
  et: "Eesti",
};

/** The languages with a page of their own, each a tile that opens it. */
export function LanguageLinks() {
  const { i18n } = useLingui();
  const links = linksIn(LANGUAGE_LINKS, i18n.locale);
  return (
    <Section nav="languages_hub">
      <Section.Header>
        <Section.Title>
          <Trans>Pick your language.</Trans>
        </Section.Title>
        <Section.Body>
          <Trans>
            Each has its own page: the script, the sounds and the free decks that language needs.
          </Trans>
        </Section.Body>
      </Section.Header>
      <ul
        className={clsx(
          "mt-10 grid grid-cols-2 gap-2.5",
          // Rows stay even: six links sit three to a row, eight four to a row.
          links.length % 3 === 0 && links.length % 4 !== 0
            ? "@2xl:grid-cols-3"
            : "@2xl:grid-cols-4",
        )}
      >
        {links.map((link, i) => (
          <li key={link.language}>
            <a
              href={link.href(i18n.locale)}
              style={trayStyle(BENTO_HUES[i % BENTO_HUES.length])}
              className="use-case-tile grid gap-1 rounded-[20px] px-5 py-4 transition-[scale] duration-150 ease-out active:scale-[0.98]"
            >
              <span
                lang={link.language}
                className="text-2xl font-medium tracking-[-0.02em] text-ink"
              >
                {link.language ? ENDONYMS[link.language] : null}
              </span>
              <span className="text-sm text-ink-secondary">{i18n._(link.label)}</span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
