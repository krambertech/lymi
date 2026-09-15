import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { FileUp } from "lucide-react";
import type { ReactNode } from "react";
import { buttonClass } from "../components/button";
import { Chip } from "../components/chip";
import { EmptySection, ErrorState } from "../components/empty-state";
import { Go } from "../components/next-steps";
import { Skeleton } from "../components/skeleton";
import type { Import } from "../lib/api";
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

/**
 * Activity: what came into the learner's decks from outside the app. Imports first; writes by
 * connected apps and the AI join the same list later. DESIGN.md "Activity".
 */
export function ActivityView({
  imports,
  error,
  onRetry,
  retrying,
  importLink,
  startLink,
}: {
  imports: Import[] | undefined;
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
        sub={t`Cards that came into your decks from outside the app.`}
      />
      {error && !imports ? (
        <ErrorState title={t`Couldn’t load Activity`} onRetry={onRetry} retrying={retrying} />
      ) : !imports ? (
        <div className="grid gap-2">
          <Skeleton className="h-[72px] rounded-lg" />
          <Skeleton className="h-[72px] rounded-lg" />
        </div>
      ) : imports.length === 0 ? (
        <EmptySection
          icon={<FileUp />}
          title={t`Nothing has come in yet`}
          body={t`Imports from Anki appear here, with what each one added.`}
          action={startLink(buttonClass("secondary"), t`Import from Anki`)}
        />
      ) : (
        <section aria-labelledby="imports-heading" className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 id="imports-heading" className="text-md font-medium">
              <Trans>Imports</Trans>
            </h2>
            {startLink(buttonClass("ghost", "sm"), t`Import from Anki`)}
          </div>
          <ul className="edge grid rounded-xl bg-plate">
            {imports.map((item) => (
              <li key={item.id} className="group/row border-edge [&:not(:first-child)]:border-t">
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
                          ? t`Anki · ${date.format(new Date(item.createdAt))} · ${plural(item.counts?.added ?? 0, { one: "# card added", other: "# cards added" })}`
                          : t`Anki · ${date.format(new Date(item.createdAt))}`}
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
    </Page>
  );
}
