import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { examsPath } from "../../lib/exams";
import { explorePath } from "../../lib/explore";
import { localizedPath } from "../../lib/routes";
import { LanguageLinks, type LanguageTarget } from "../LanguageLinks";
import { Lockup } from "../Logo";
import { EXAM_LINKS, LANGUAGE_LINKS, linksIn, type SiteLink, USE_CASE_LINKS } from "./site-links";

const linkClass = "rounded-xs hoverable:hover:text-ink";

interface GroupProps {
  title: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  listClassName?: string | undefined;
}

function Group({ title, children, className, listClassName }: GroupProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-ink">{title}</p>
      <ul className={clsx("mt-3 grid gap-2.5 text-sm text-ink-muted", listClassName)}>
        {children}
      </ul>
    </div>
  );
}

function Links({ links }: { links: readonly SiteLink[] }) {
  const { i18n } = useLingui();
  return links.map((link) => (
    <li key={link.href("en")}>
      <a href={link.href(i18n.locale)} className={linkClass}>
        {i18n._(link.label)}
      </a>
    </li>
  ));
}

function AllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex items-center gap-1 rounded-xs text-ink-secondary hoverable:hover:text-ink"
      >
        {children}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </a>
    </li>
  );
}

/** The language links lead to the same page in each locale. */
type Props = { openAppUrl: string } & LanguageTarget;

export function SiteFooter({ openAppUrl, ...languages }: Props) {
  const { i18n } = useLingui();

  return (
    <footer data-nav="footer" className="border-t border-edge px-5 pt-12 pb-10 @2xl:px-10">
      <div className="mx-auto grid max-w-[1040px] gap-10 @4xl:grid-cols-[13rem_1fr] @4xl:gap-12">
        <div>
          <Lockup size={22} />
          <p className="mt-3.5 max-w-[26ch] text-sm text-pretty text-ink-secondary">
            <Trans>Flashcards that come back right before you’d forget.</Trans>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={localizedPath("download", i18n.locale)}
              className="rounded-sm bg-plate px-3 py-1.5 text-sm font-medium text-ink edge-strong"
            >
              <Trans>Lymi for Mac</Trans>
            </a>
            <a
              href={openAppUrl}
              className="rounded-sm bg-plate px-3 py-1.5 text-sm font-medium text-ink edge-strong"
            >
              <Trans>Open Lymi</Trans>
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 @2xl:grid-cols-[repeat(5,auto)] @2xl:justify-between @2xl:gap-x-8">
          <Group
            title={<Trans>Use cases</Trans>}
            className="col-span-2 @2xl:col-span-1"
            listClassName="grid-flow-col grid-rows-4 gap-x-10 @2xl:grid-flow-row @2xl:grid-rows-none"
          >
            {USE_CASE_LINKS.map((link) => (
              <li key={link.page}>
                <a href={localizedPath(link.page, i18n.locale)} className={linkClass}>
                  {i18n._(link.label)}
                </a>
              </li>
            ))}
          </Group>
          <Group title={<Trans>Languages</Trans>}>
            <Links links={linksIn(LANGUAGE_LINKS, i18n.locale)} />
            <AllLink href={localizedPath("languages", i18n.locale)}>
              <Trans>All languages</Trans>
            </AllLink>
          </Group>
          <Group title={<Trans>Exams</Trans>}>
            <Links links={EXAM_LINKS} />
            <AllLink href={examsPath(i18n.locale)}>
              <Trans>All exams</Trans>
            </AllLink>
          </Group>
          <Group title={<Trans>Resources</Trans>}>
            <li>
              <a href={explorePath(i18n.locale)} className={linkClass}>
                <Trans>Explore decks</Trans>
              </a>
            </li>
            <li>
              <a href="/docs" className={linkClass}>
                <Trans>Docs</Trans>
              </a>
            </li>
            <li>
              <a href="/docs/mcp" className={linkClass}>
                <Trans>Connect an assistant</Trans>
              </a>
            </li>
            <li>
              <a href="/docs/api" className={linkClass}>
                <Trans>API reference</Trans>
              </a>
            </li>
            <li>
              <a href="/docs/import-from-anki" className={linkClass}>
                <Trans>Move from Anki</Trans>
              </a>
            </li>
            <li>
              <a href="/docs/import-from-mochi" className={linkClass}>
                <Trans>Move from Mochi</Trans>
              </a>
            </li>
          </Group>
          <Group title="Lymi">
            <li>
              <a href={localizedPath("changelog", i18n.locale)} className={linkClass}>
                <Trans>Changelog</Trans>
              </a>
            </li>
            <li>
              <a href="/support" className={linkClass}>
                <Trans>Support</Trans>
              </a>
            </li>
          </Group>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-[1040px] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-edge pt-5 text-xs text-ink-muted">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {/* Pages prerender where the clock reads 1970, so the year comes from the build. */}
          <span>© {import.meta.env.BUILD_DAY?.slice(0, 4)} Lymi</span>
          <a href={localizedPath("privacy", i18n.locale)} className={linkClass}>
            <Trans>Privacy</Trans>
          </a>
          <a href="/terms" className={linkClass}>
            <Trans>Terms</Trans>
          </a>
        </p>
        <LanguageLinks className="" {...languages} />
      </div>
    </footer>
  );
}
