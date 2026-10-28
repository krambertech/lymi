import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Columns2, Monitor, Moon, Send, Smartphone, Sun } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Button } from "../components/button";
import { Kbd } from "../components/kbd";
import { AppTile, Wordmark } from "../components/logo";
import { RailHeading, RailNav, RailRow } from "../components/rail-nav";
import { Segmented } from "../components/segmented";
import { IconToggle } from "../design/icon-toggle";
import { devApi, type RenderedEmail } from "../dev/dev-api";

type Room = "light" | "dark" | "both";
type Width = "desktop" | "phone";
type Language = "en" | "uk" | "ru";

/** What a reviewer needs to know about each kind: what to call it and when a learner gets it. */
const KINDS: { group: string; kinds: { kind: string; name: string; when: string }[] }[] = [
  {
    group: "Account",
    kinds: [
      {
        kind: "verify-email",
        name: "Confirm address",
        when: "Someone signs up on the web with an email and a password.",
      },
      {
        kind: "verify-email-code",
        name: "Confirmation code",
        when: "Someone signs up with email in the phone app.",
      },
      {
        kind: "reset-password",
        name: "Reset password",
        when: "A learner asks for a new password.",
      },
      {
        kind: "existing-account",
        name: "Already has an account",
        when: "Someone signs up with an address that already has an account.",
      },
      {
        kind: "google-account",
        name: "Signs in with Google",
        when: "Someone signs up with a password for an address that signs in with Google.",
      },
      {
        kind: "reset-google-account",
        name: "No password to reset",
        when: "Someone asks to reset the password of an address that signs in with Google.",
      },
      {
        kind: "delete-account-code",
        name: "Delete account code",
        when: "A learner starts deleting their account.",
      },
      {
        kind: "account-deleted",
        name: "Account deleted",
        when: "Right after an account is deleted, to the address it had.",
      },
    ],
  },
  {
    group: "Decks",
    kinds: [
      {
        kind: "deck-invitation",
        name: "Deck invitation",
        when: "A deck's owner invites an email address to study it.",
      },
    ],
  },
  {
    group: "To Lymi",
    kinds: [
      {
        kind: "feedback",
        name: "Feedback",
        when: "A learner sends feedback. It goes to hello@lymi.app, answerable to them.",
      },
      {
        kind: "content-report",
        name: "Content report",
        when: "A learner reports a deck or card someone else wrote. It goes to hello@lymi.app.",
      },
      {
        kind: "test",
        name: "Test email",
        when: "An operator sends the production smoke test.",
      },
    ],
  },
];
const ORDER = KINDS.flatMap((group) => group.kinds);

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "uk", label: "UK" },
  { value: "ru", label: "RU" },
];

/**
 * The local `/emails` page: every kind with its sample, in each language and room, at a desktop
 * or phone width, with what an inbox shows above it. Send to my inbox goes through Resend.
 */
export function EmailPreview() {
  const search = useSearch({ from: "/emails" });
  const navigate = useNavigate({ from: "/emails" });
  const kind = ORDER.some((k) => k.kind === search.kind) ? (search.kind as string) : "verify-email";
  const language = search.lang ?? "en";
  const room = search.room ?? "light";
  const width = search.width ?? "desktop";
  const view = search.view ?? "html";
  const about = ORDER.find((k) => k.kind === kind);
  const set = (next: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

  const catalog = useQuery({ queryKey: ["dev", "emails"], queryFn: devApi.emails });
  const email = useQuery({
    queryKey: ["dev", "emails", kind, language],
    queryFn: () => devApi.renderEmail(kind, language),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    document.title = `${about?.name ?? "Emails"} · Lymi emails`;
  }, [about]);

  // J and K move through the kinds, as in a mail client; the arrows keep scrolling the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea"))
        return;
      const step = event.key === "j" ? 1 : event.key === "k" ? -1 : 0;
      if (!step) return;
      const at = ORDER.findIndex((k) => k.kind === kind);
      const next = ORDER[(at + step + ORDER.length) % ORDER.length];
      if (next) navigate({ search: (prev) => ({ ...prev, kind: next.kind }), replace: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind, navigate]);

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 self-start border-e border-edge bg-rail md:flex md:flex-col">
        <div className="mx-3 mt-8 mb-6 flex h-10 items-center gap-2.5 ps-2.5">
          <AppTile size={28} />
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <Wordmark size={18} className="text-ink" />
            <i className="size-1 rounded-full bg-ink-faint" />
            <span className="text-md font-medium tracking-[-0.01em] text-ink-muted">emails</span>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
          <RailNav aria-label="Emails" rows={kind}>
            {KINDS.map((group, i) => (
              <Fragment key={group.group}>
                <RailHeading className={i === 0 ? "mt-0" : undefined}>{group.group}</RailHeading>
                {group.kinds.map((k) => (
                  <RailRow
                    key={k.kind}
                    render={<button type="button" onClick={() => set({ kind: k.kind })} />}
                    aria-current={k.kind === kind ? "page" : undefined}
                    className={clsx("h-11 w-full text-start md:h-9", k.kind === kind && "active")}
                  >
                    {k.name}
                  </RailRow>
                ))}
              </Fragment>
            ))}
          </RailNav>
        </div>
        <p className="flex items-center gap-1.5 border-t border-edge px-5 py-4 text-sm text-ink-muted">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd>
          <span className="ms-1">to move between emails</span>
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-(--z-sticky) border-b border-edge bg-canvas/90 px-5 py-4 backdrop-blur md:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Email"
              value={kind}
              onChange={(event) => set({ kind: event.target.value })}
              className="h-9 rounded-md border border-edge bg-plate px-2 text-sm md:hidden"
            >
              {ORDER.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.name}
                </option>
              ))}
            </select>
            <Segmented
              label="Language"
              size="sm"
              value={language}
              onValueChange={(lang) => set({ lang })}
              options={LANGUAGES}
            />
            <IconToggle<Room>
              label="Room"
              value={room}
              onChange={(next) => set({ room: next })}
              options={[
                { value: "light", label: "Day", Icon: Sun },
                { value: "dark", label: "Night", Icon: Moon },
                { value: "both", label: "Day and night side by side", Icon: Columns2 },
              ]}
            />
            <IconToggle<Width>
              label="Width"
              value={width}
              onChange={(next) => set({ width: next })}
              options={[
                { value: "desktop", label: "Desktop", Icon: Monitor },
                { value: "phone", label: "Phone", Icon: Smartphone },
              ]}
            />
            <Segmented
              label="Body"
              size="sm"
              value={view}
              onValueChange={(next) => set({ view: next })}
              options={[
                { value: "html", label: "HTML" },
                { value: "text", label: "Plain text" },
              ]}
            />
            <SendToInbox
              kind={kind}
              language={language}
              operators={catalog.data?.operators ?? []}
              canSend={catalog.data?.canSend ?? false}
            />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-5 pt-8 pb-16 md:px-10">
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.01em]">{about?.name}</h1>
            <p className="mt-1 text-ink-secondary">{about?.when}</p>
          </div>

          {email.data && <Envelope email={email.data} />}
          {email.isError && <p className="text-sm text-danger">{email.error.message}</p>}

          {view === "text" ? (
            <pre className="edge max-w-[720px] whitespace-pre-wrap rounded-lg bg-plate p-6 font-sans text-sm leading-relaxed text-ink-secondary">
              {email.data?.text}
            </pre>
          ) : (
            <div
              className={clsx(
                width === "phone" ? "flex flex-wrap gap-6" : "grid gap-6",
                room === "both" && width === "desktop" && "xl:grid-cols-2",
              )}
            >
              {(room === "both" ? (["light", "dark"] as const) : [room]).map((r) => (
                <EmailFrame key={r} html={email.data?.html ?? ""} room={r} width={width} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/** What an inbox shows before the email is opened. */
function Envelope({ email }: { email: RenderedEmail }) {
  const rows: [string, string][] = [
    ["From", email.from],
    ["To", email.to],
    ["Reply-to", email.replyTo],
  ];
  return (
    <div className="edge grid max-w-[720px] gap-4 rounded-lg bg-plate p-5 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <p className="truncate font-medium">{email.subject}</p>
        <p className="truncate text-sm text-ink-muted">{email.preview}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt className="text-ink-muted">{label}</dt>
            <dd className="truncate text-ink-secondary">{value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

/** A frame does not pass the night room to its document, so the email's dark rules are switched on directly. */
function inRoom(html: string, room: "light" | "dark"): string {
  return room === "dark" ? html.replace("@media (prefers-color-scheme: dark)", "@media all") : html;
}

/** One rendered email, as tall as its content, at a desktop or phone width. */
function EmailFrame({ html, room, width }: { html: string; room: "light" | "dark"; width: Width }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(640);

  const measure = () => {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return;
    // The body's own height, since the document is never shorter than the frame around it.
    const resize = () => setHeight(Math.ceil(doc.body.getBoundingClientRect().height));
    resize();
    // Images arrive after load and change the height.
    observer.current?.disconnect();
    observer.current = new ResizeObserver(resize);
    observer.current.observe(doc.body);
  };

  useEffect(() => () => observer.current?.disconnect(), []);

  return (
    <figure className={clsx("flex flex-col gap-2", width === "phone" && "w-[375px] max-w-full")}>
      <figcaption className="flex items-center gap-1.5 text-sm text-ink-muted">
        {room === "light" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        {room === "light" ? "Day" : "Night"} · {width === "phone" ? "375 px" : "Desktop"}
      </figcaption>
      <div
        className={clsx(
          "edge overflow-hidden bg-plate",
          width === "phone" ? "rounded-[28px] p-1.5" : "rounded-lg",
        )}
      >
        <iframe
          ref={ref}
          title={`Email, ${room === "light" ? "day" : "night"}`}
          srcDoc={inRoom(html, room)}
          onLoad={measure}
          style={{ height }}
          className={clsx("block w-full", width === "phone" && "rounded-[22px]")}
        />
      </div>
    </figure>
  );
}

function SendToInbox({
  kind,
  language,
  operators,
  canSend,
}: {
  kind: string;
  language: Language;
  operators: string[];
  canSend: boolean;
}) {
  const [to, setTo] = useState("");
  const address = to || operators[0] || "";
  const send = useMutation({ mutationFn: () => devApi.sendEmail(kind, language, address) });

  return (
    <div className="ms-auto flex items-center gap-2">
      {send.isSuccess && <span className="text-sm text-success">Sent to {address}</span>}
      {send.isError && <span className="text-sm text-danger">{send.error.message}</span>}
      {!canSend && (
        <span className="hidden text-sm text-ink-muted lg:inline">
          Add RESEND_API_KEY to apps/web/.dev.vars to send
        </span>
      )}
      {operators.length > 1 && (
        <select
          aria-label="Send to"
          value={address}
          onChange={(event) => setTo(event.target.value)}
          className="h-9 rounded-md border border-edge bg-plate px-2 text-sm"
        >
          {operators.map((operator) => (
            <option key={operator}>{operator}</option>
          ))}
        </select>
      )}
      <Button
        size="sm"
        variant="primary"
        loading={send.isPending}
        aria-disabled={!canSend || !address}
        onClick={() => send.mutate()}
      >
        <Send aria-hidden="true" />
        Send to my inbox
      </Button>
    </div>
  );
}
