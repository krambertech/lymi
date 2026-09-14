import { Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { LanguageLinks } from "../LanguageLinks";
import { Lockup } from "../Logo";
import { assistantsHref, estonianHref, languagesHref } from "./pages";

const linkClass = "rounded-xs hoverable:hover:text-text";

function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-text">{title}</p>
      <ul className="mt-3 flex flex-col gap-2.5 text-sm text-muted">{children}</ul>
    </div>
  );
}

interface Props {
  openAppUrl: string;
  /** The page's translations, when it has any. */
  translations?: "landing" | undefined;
}

/** Links grouped by who is looking, so a new use case page is one more line rather than a longer row. */
export function SiteFooter({ openAppUrl, translations }: Props) {
  const { i18n } = useLingui();
  const languages = languagesHref(i18n.locale);
  const estonian = estonianHref(i18n.locale);
  const assistants = assistantsHref(i18n.locale);

  return (
    <footer className="border-t border-edge px-5 pt-12 pb-10 @2xl:px-10">
      <div className="mx-auto grid max-w-[1040px] gap-10 @xl:grid-cols-[1fr_auto] @4xl:gap-16">
        <div>
          <Lockup size={18} className="text-muted" />
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-8 @2xl:grid-cols-3 @2xl:gap-x-16">
          {languages && (
            <Group title={<Trans>Learn</Trans>}>
              <li>
                <a href={languages} className={linkClass}>
                  <Trans>Language learning</Trans>
                </a>
              </li>
              {estonian && (
                <li>
                  <a href={estonian} className={linkClass}>
                    <Trans>Estonian</Trans>
                  </a>
                </li>
              )}
              {assistants && (
                <li>
                  <a href={assistants} className={linkClass}>
                    <Trans>AI assistants</Trans>
                  </a>
                </li>
              )}
            </Group>
          )}
          <Group title={<Trans>Build</Trans>}>
            <li>
              <a href="/docs" className={linkClass}>
                <Trans>Docs</Trans>
              </a>
            </li>
            <li>
              <a href="/docs/api" className={linkClass}>
                API
              </a>
            </li>
            <li>
              <a href="/docs/mcp" className={linkClass}>
                MCP
              </a>
            </li>
          </Group>
          <Group title="Lymi">
            <li>
              <a href={openAppUrl} className={linkClass}>
                <Trans>Open Lymi</Trans>
              </a>
            </li>
            <li>
              <a href="/support" className={linkClass}>
                <Trans>Support</Trans>
              </a>
            </li>
            <li>
              <a href="/privacy" className={linkClass}>
                <Trans>Privacy</Trans>
              </a>
            </li>
            <li>
              <a href="/terms" className={linkClass}>
                <Trans>Terms</Trans>
              </a>
            </li>
          </Group>
        </div>
      </div>
      {translations && <LanguageLinks page={translations} />}
    </footer>
  );
}
