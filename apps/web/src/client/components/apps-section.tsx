import { Trans, useLingui } from "@lingui/react/macro";
import { listedApp } from "@lymi/client/app-marks";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { CircleAlert, Plug } from "lucide-react";
import type { ReactNode } from "react";
import type { ConnectedApp, Readwise } from "../lib/api";
import { errorMessage } from "../lib/api";
import { ASSISTANTS, type Assistant, appPageParams, assistantOf } from "../lib/assistants";
import { connectedAppsQuery, keysQuery, readwiseQuery } from "../lib/queries";
import { yomitanKey } from "../lib/yomitan";
import { lastUsed, shortDate } from "./api-keys-section";
import { AppMark, identifyApp } from "./app-mark";
import { Go } from "./next-steps";
import { ReadwiseMark } from "./readwise-mark";
import { SettingsGroup } from "./settings-group";
import { Skeleton } from "./skeleton";
import { YomitanMark } from "./yomitan-mark";

const ROW =
  "group flex min-h-16 items-center gap-3 px-4 py-3 transition-[background-color] duration-150 hoverable:hover:veil group-first/row:rounded-t-xl group-last/row:rounded-b-xl";
const CHIP =
  "edge inline-flex h-9 items-center gap-2 rounded-full bg-plate ps-2.5 pe-3.5 text-sm font-medium text-text transition-[background-color] duration-150 hoverable:hover:veil";

/**
 * Every app that adds cards: the connected ones as rows, then the rest as chips. Each opens its
 * own page, where it is set up or stopped. docs/design/app-pages.md.
 */
export function AppsSection() {
  const { t, i18n } = useLingui();
  const apps = useQuery(connectedAppsQuery);
  const readwise = useQuery(readwiseQuery);
  const keys = useQuery(keysQuery);

  const loading = apps.isPending || readwise.isPending || keys.isPending;
  const consents = apps.data ?? [];
  const connection = readwise.data?.connection ?? null;
  const yomitan = yomitanKey(keys.data);
  const connectedKeys = new Set(consents.map((c) => assistantOf(c)?.key));
  const toAdd = ASSISTANTS.filter((a) => a.key === "custom" || !connectedKeys.has(a.key));
  const none = consents.length === 0 && !connection && !yomitan;
  const pages = appPageParams(consents);

  return (
    <SettingsGroup id="apps" title={t`Apps`} description={t`Apps that add cards to your decks.`}>
      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : none ? (
        <Empty />
      ) : (
        <ul aria-label={t`Your apps`} className="edge grid rounded-xl bg-plate">
          {consents.map((item) => (
            <AssistantRow key={item.id} item={item} page={pages.get(item.id) ?? item.id} />
          ))}
          {connection && (
            <Row
              link={{ to: "/settings/readwise" }}
              mark={<ReadwiseMark className="size-9" />}
              name="Readwise"
            >
              <ReadwiseStatus connection={connection} />
            </Row>
          )}
          {yomitan && (
            <Row
              link={{ to: "/settings/yomitan" }}
              mark={<YomitanMark className="size-9" />}
              name="Yomitan"
            >
              <span className="text-sm text-muted tabular-nums">
                <Trans>
                  Key made {shortDate(i18n, yomitan.createdAt)} ·{" "}
                  {lastUsed(i18n, yomitan.lastRequest)}
                </Trans>
              </span>
            </Row>
          )}
          <li className="grid gap-2.5 border-edge border-t px-4 py-3.5">
            <span className="text-sm text-muted">
              <Trans>Add an app</Trans>
            </span>
            <Chips assistants={toAdd} readwise={!connection} yomitan={!yomitan} />
          </li>
        </ul>
      )}

      {apps.isError && (
        <p className="text-sm text-danger" role="alert">
          {errorMessage(apps.error)}
        </p>
      )}
    </SettingsGroup>
  );
}

/** Nothing connected yet: the apps' own marks, what they do, and every one of them to pick. */
function Empty() {
  const fan = ASSISTANTS.slice(0, 2).flatMap((a) => (a.app ? [a.app] : []));
  const gemini = ASSISTANTS[2]?.app;
  return (
    <div className="edge grid justify-items-center gap-4 rounded-xl bg-plate px-4 pt-6 pb-5 text-center [background-image:radial-gradient(120%_80%_at_50%_0%,var(--amber-soft),transparent_60%)]">
      <div aria-hidden="true" className="flex">
        {[
          ...fan.map((app) => <AppMark key={app.name} app={app} className="size-11" />),
          <ReadwiseMark key="readwise" className="size-11" />,
          ...(gemini ? [<AppMark key="gemini" app={gemini} className="size-11" />] : []),
          <YomitanMark key="yomitan" className="size-11" />,
        ].map((mark, i) => (
          <span
            key={String(i)}
            className={clsx("-ms-1.5 block rounded-[13px] bg-plate p-0.5 first:ms-0", FAN[i])}
          >
            {mark}
          </span>
        ))}
      </div>
      <div className="grid max-w-[40ch] gap-1">
        <p className="text-md font-medium text-text">
          <Trans>Connect your first app</Trans>
        </p>
        <p className="text-sm text-muted text-pretty">
          <Trans>
            An assistant turns a lesson, a PDF or a chat into cards. Readwise and Yomitan add words
            as you read.
          </Trans>
        </p>
      </div>
      <Chips assistants={ASSISTANTS} readwise yomitan className="justify-center" />
    </div>
  );
}

/** The fan's tilt, outermost tiles most, so the five read as a hand of apps. */
const FAN = [
  "-rotate-8 translate-y-1",
  "-rotate-4",
  "relative z-10 -translate-y-0.5",
  "rotate-4",
  "rotate-8 translate-y-1",
];

function Chips({
  assistants,
  readwise,
  yomitan,
  className,
}: {
  assistants: readonly Assistant[];
  readwise: boolean;
  yomitan: boolean;
  className?: string;
}) {
  const { t } = useLingui();
  const ai = assistants.filter((a) => a.key !== "custom");
  return (
    <ul aria-label={t`Apps you can add`} className={clsx("flex flex-wrap gap-2", className)}>
      {ai.map((a) => (
        <li key={a.key}>
          <Link to="/settings/apps/$app" params={{ app: a.key }} className={CHIP}>
            {a.app && <ChipGlyph path={a.app.path} brand={a.app.brand} />}
            {a.app?.name}
          </Link>
        </li>
      ))}
      {readwise && (
        <li>
          <Link to="/settings/readwise" className={CHIP}>
            <ReadwiseMark className="size-4" bare />
            Readwise
          </Link>
        </li>
      )}
      {yomitan && (
        <li>
          <Link to="/settings/yomitan" className={CHIP}>
            <YomitanMark className="size-4" bare />
            Yomitan
          </Link>
        </li>
      )}
      <li>
        <Link to="/settings/apps/$app" params={{ app: "custom" }} className={CHIP}>
          <Plug className="size-4 text-text-2" aria-hidden="true" />
          <Trans>Custom MCP</Trans>
        </Link>
      </li>
    </ul>
  );
}

function ChipGlyph({ path, brand }: { path: string | null; brand: string | null }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill={brand ?? "currentColor"}>
      {path && <path d={path} />}
    </svg>
  );
}

type RowLink =
  | { to: "/settings/readwise" | "/settings/yomitan" }
  | { to: "/settings/apps/$app"; params: { app: string } };

function Row({
  link,
  mark,
  name,
  children,
}: {
  link: RowLink;
  mark: ReactNode;
  name: string;
  children: ReactNode;
}) {
  return (
    <li className="group/row border-edge [&:not(:first-child)]:border-t">
      <Link {...link} className={ROW}>
        {mark}
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-md font-medium">{name}</span>
          {children}
        </span>
        <Go />
      </Link>
    </li>
  );
}

function AssistantRow({ item, page }: { item: ConnectedApp; page: string }) {
  const { t, i18n } = useLingui();
  const app = identifyApp(item.clientId, item.name);
  const listed = listedApp(app);
  const connected = i18n.date(item.createdAt, { day: "numeric", month: "short" });
  return (
    <Row
      link={{ to: "/settings/apps/$app", params: { app: page } }}
      mark={<AppMark app={{ ...app, name: listed.title }} className="size-9" />}
      name={listed.title ?? t`An app`}
    >
      <span className="flex min-w-0 items-center gap-1 text-sm text-muted">
        {listed.unverified && (
          <>
            <span
              className={clsx("flex shrink-0 items-center gap-1", listed.borrowed && "text-danger")}
            >
              <CircleAlert className="size-3.5" aria-hidden="true" />
              <Trans>Unverified</Trans>
            </span>
            <span aria-hidden="true">·</span>
          </>
        )}
        {listed.host && (
          <>
            <span className="truncate font-mono">{listed.host}</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <span className="shrink-0 tabular-nums">
          <Trans>connected {connected}</Trans>
        </span>
      </span>
    </Row>
  );
}

function ReadwiseStatus({ connection }: { connection: Readwise }) {
  const { i18n } = useLingui();
  if (connection.status === "unreadable" || connection.status === "refused") {
    return (
      <span className="flex items-center gap-1 text-sm text-danger">
        <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        {connection.status === "unreadable" ? (
          <Trans>Lymi needs your Readwise token again</Trans>
        ) : (
          <Trans>Readwise no longer accepts your token</Trans>
        )}
      </span>
    );
  }
  const at = connection.lastPull?.at;
  if (!at) {
    return (
      <span className="text-sm text-muted">
        <Trans>Connected. Lymi checks every hour.</Trans>
      </span>
    );
  }
  const when = i18n.date(new Date(at), { hour: "numeric", minute: "2-digit" });
  return (
    <span className="text-sm text-muted">
      <Trans>Connected. Last checked at {when}.</Trans>
    </span>
  );
}
