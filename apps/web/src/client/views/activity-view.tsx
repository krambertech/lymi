import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Download, FileUp } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "../components/button";
import { Chip } from "../components/chip";
import { EmptySection, ErrorState } from "../components/empty-state";
import { SOURCE_NAMES } from "../components/import-parts";
import { Go } from "../components/next-steps";
import { Skeleton } from "../components/skeleton";
import type { Export, Import } from "../lib/api";
import { Page, PageHeader } from "./shell";

/** What a row says about where an import is. Done says nothing: its counts say it. */
function StatusChip({ item }: { item: Import }) {
  const { t } = useLingui();
  if (item.archivedAt) return <Chip>{t`Archived`}</Chip>;
  switch (item.status) {
    case "uploading":
      return <Chip>{t`Uploading`}</Chip>;
    case "inspecting":
      return <Chip>{t`Reading`}</Chip>;
    case "ready":
      return <Chip>{t`Waiting for you`}</Chip>;
    case "importing":
      return <Chip>{t`Importing`}</Chip>;
    case "failed":
      return <Chip tone="danger">{t`Stopped`}</Chip>;
    case "cancelled":
      return <Chip>{t`Cancelled`}</Chip>;
    default:
      return null;
  }
}

/** One export: its file, where it stands, and the download while the file lasts. */
function ExportRow({ item }: { item: Export }) {
  const { t, i18n } = useLingui();
  const date = new Intl.DateTimeFormat(i18n.locale, { dateStyle: "medium" });
  const format = item.format === "lymi" ? t`Lymi file` : t`Anki package`;
  const when = date.format(new Date(item.createdAt));
  const cards = item.counts?.cards ?? 0;
  return (
    <div className="flex min-h-[72px] items-center gap-3 px-4 py-3">
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-md font-medium">{item.fileName}</span>
          {item.status === "exporting" && <Chip>{t`Writing`}</Chip>}
          {item.status === "failed" && <Chip tone="danger">{t`Stopped`}</Chip>}
          {item.status === "expired" && <Chip>{t`Deleted`}</Chip>}
        </span>
        <span className="text-sm text-muted tabular-nums">
          {item.status === "done"
            ? t`${format} · ${when} · ${plural(cards, { one: "# card", other: "# cards" })}`
            : t`${format} · ${when}`}
        </span>
      </span>
      {item.status === "done" && item.downloadUrl && (
        <a
          href={item.downloadUrl}
          download={item.fileName}
          className={buttonClass("secondary", "sm")}
          aria-label={t`Download ${item.fileName}`}
        >
          <Download aria-hidden="true" />
          <Trans>Download</Trans>
        </a>
      )}
    </div>
  );
}

/**
 * Activity: what came into the learner's decks from outside the app. Imports first; writes by
 * connected apps and the AI join the same list later. docs/design/imports.md.
 */
export function ActivityView({
  imports,
  exports = [],
  error,
  onRetry,
  retrying,
  importLink,
  startLink,
}: {
  imports: Import[] | undefined;
  /** Files taken out, newest first; an export's file lasts a day. */
  exports?: Export[] | undefined;
  error?: boolean | undefined;
  onRetry: () => void;
  retrying?: boolean | undefined;
  importLink: (item: Import, className: string, children: ReactNode) => ReactNode;
  startLink: (className: string, children: ReactNode) => ReactNode;
}) {
  const { t, i18n } = useLingui();
  const date = new Intl.DateTimeFormat(i18n.locale, { dateStyle: "medium" });
  return (
    <Page width="md">
      <PageHeader
        title={t`Activity`}
        sub={t`Cards that came in from other apps, and files you took out.`}
      />
      {error && !imports ? (
        <ErrorState title={t`Couldn’t load Activity`} onRetry={onRetry} retrying={retrying} />
      ) : !imports ? (
        <div className="grid gap-2">
          <Skeleton className="h-[72px] rounded-lg" />
          <Skeleton className="h-[72px] rounded-lg" />
        </div>
      ) : imports.length === 0 && exports.length === 0 ? (
        <EmptySection
          icon={<FileUp />}
          title={t`Nothing has come in yet`}
          body={t`Imports from Anki and Mochi appear here, with what each one added.`}
          action={startLink(buttonClass("secondary"), t`Import cards`)}
        />
      ) : (
        <>
          {exports.length > 0 && (
            <section aria-labelledby="exports-heading" className="mb-8 grid gap-2">
              <h2 id="exports-heading" className="text-md font-medium">
                <Trans>Exports</Trans>
              </h2>
              <ul className="edge grid rounded-xl bg-plate">
                {exports.map((item) => (
                  <li key={item.id} className="border-edge [&:not(:first-child)]:border-t">
                    <ExportRow item={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {imports.length > 0 && (
            <section aria-labelledby="imports-heading" className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 id="imports-heading" className="text-md font-medium">
                  <Trans>Imports</Trans>
                </h2>
                {startLink(buttonClass("ghost", "sm"), t`Import cards`)}
              </div>
              <ul className="edge grid rounded-xl bg-plate">
                {imports.map((item) => (
                  <li
                    key={item.id}
                    className="group/row border-edge [&:not(:first-child)]:border-t"
                  >
                    {importLink(
                      item,
                      "group flex min-h-[72px] items-center gap-3 px-4 py-3 transition-[background-color] duration-150 hoverable:hover:bg-hover group-first/row:rounded-t-xl group-last/row:rounded-b-xl",
                      <>
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-md font-medium">{item.fileName}</span>
                            <StatusChip item={item} />
                          </span>
                          <span className="text-sm text-muted tabular-nums">
                            {item.status === "done" ||
                            (item.status === "failed" && (item.counts?.added ?? 0) > 0)
                              ? t`${SOURCE_NAMES[item.source]} · ${date.format(new Date(item.createdAt))} · ${plural(item.counts?.added ?? 0, { one: "# card added", other: "# cards added" })}`
                              : t`${SOURCE_NAMES[item.source]} · ${date.format(new Date(item.createdAt))}`}
                          </span>
                        </span>
                        <Go />
                      </>,
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Page>
  );
}
