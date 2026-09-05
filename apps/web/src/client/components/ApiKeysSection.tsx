import type { Scope } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { type ApiKeySummary, api } from "../lib/api";
import { keysQuery } from "../lib/queries";
import { Button } from "./Button";
import { Chip } from "./Chip";

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: "read", label: "Read", hint: "Lists and searches decks and cards." },
  { value: "write", label: "Read and write", hint: "Also adds, edits and archives them." },
];

/**
 * Personal API keys for curl, scripts and Claude Code. The key is shown once, right after it
 * is made. Revoking is final, so it takes a second tap, inline, no dialog.
 */
export function ApiKeysSection() {
  const qc = useQueryClient();
  const keys = useQuery(keysQuery);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("read");
  const [fresh, setFresh] = useState<{ id: string; key: string; name: string } | null>(null);

  const create = useMutation({
    mutationFn: () => api.createKey({ name: name.trim(), scope }),
    onSuccess: (created) => {
      setFresh({ id: created.id, key: created.key, name: created.name ?? name.trim() });
      setName("");
      setScope("read");
      qc.invalidateQueries({ queryKey: ["keys"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeKey(id),
    onSuccess: (_r, id) => {
      if (fresh?.id === id) setFresh(null);
      qc.invalidateQueries({ queryKey: ["keys"] });
    },
  });

  const canCreate = name.trim().length > 0 && !create.isPending;

  return (
    <section className="mt-3 grid gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-1">
        <h2 className="text-[13px] font-semibold text-muted">API keys</h2>
        <p className="max-w-[60ch] text-[14.5px] text-ink-2">
          For curl, scripts and Claude Code. Send the key in an <code>x-api-key</code> header; the
          routes are in the{" "}
          <a href="/api/docs" className="underline decoration-border-strong underline-offset-2">
            API reference
          </a>
          . MCP clients such as Claude Desktop sign in with OAuth instead and do not need one.
        </p>
      </div>

      {fresh && (
        <FreshKey
          name={fresh.name}
          value={fresh.key}
          onDone={() => setFresh(null)}
          onRevoke={() => revoke.mutate(fresh.id)}
        />
      )}

      {keys.isSuccess && keys.data.length === 0 && !fresh && (
        <p className="text-[14.5px] text-muted">No keys yet.</p>
      )}

      {keys.data && keys.data.length > 0 && (
        <ul className="-mx-1 grid">
          {keys.data.map((k) => (
            <KeyRow
              key={k.id}
              item={k}
              revoking={revoke.isPending && revoke.variables === k.id}
              onRevoke={() => revoke.mutate(k.id)}
            />
          ))}
        </ul>
      )}

      <form
        className="grid gap-3 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canCreate) create.mutate();
        }}
      >
        <label className="grid gap-1.5">
          <span className="text-[12.5px] font-medium text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="Claude Code on the laptop"
            autoComplete="off"
            className="h-10 w-full max-w-sm rounded-md border border-border-strong bg-bg px-3.5 text-[16px] placeholder:text-muted focus:border-amber focus:outline-none focus:ring-[3px] focus:ring-amber-soft"
          />
        </label>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-[12.5px] font-medium text-muted">Access</legend>
          <div className="inline-flex w-fit gap-0.5 rounded-md border border-border bg-bg p-[3px]">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={scope === s.value}
                onClick={() => setScope(s.value)}
                className={clsx(
                  "h-7 rounded-[10px] px-3 text-[13px] font-medium transition-[background-color,box-shadow] duration-150",
                  scope === s.value
                    ? "bg-surface text-ink shadow-[0_1px_2px_oklch(0_0_0/0.12)]"
                    : "text-muted hover:text-ink-2",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[12.5px] text-muted">
            {SCOPES.find((s) => s.value === scope)?.hint} Keys never grade reviews.
          </p>
        </fieldset>
        {create.isError && (
          <p className="text-[13px] text-amber-text" role="alert">
            {(create.error as Error).message}
          </p>
        )}
        <Button type="submit" size="sm" className="w-fit" disabled={!canCreate}>
          Create key
        </Button>
      </form>
    </section>
  );
}

function KeyRow({
  item,
  revoking,
  onRevoke,
}: {
  item: ApiKeySummary;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 6000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14.5px] font-medium">{item.name ?? "Untitled key"}</span>
          <Chip>{item.scope === "write" ? "Read and write" : "Read"}</Chip>
        </div>
        <p className="text-[12.5px] text-muted tabular-nums">
          {item.start}… · {lastUsed(item.lastRequest)} · created {shortDate(item.createdAt)}
        </p>
      </div>
      {confirming ? (
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
          <Button size="sm" loading={revoking} disabled={revoking} onClick={onRevoke}>
            Revoke key
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          Revoke
        </Button>
      )}
    </li>
  );
}

function FreshKey({
  name,
  value,
  onDone,
  onRevoke,
}: {
  name: string;
  value: string;
  onDone: () => void;
  onRevoke: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="grid gap-2.5 rounded-md border border-amber-soft bg-raised p-3.5" role="status">
      <p className="text-[14.5px]">
        <span className="font-medium">{name}</span> is ready. Copy it now; it is not shown again.
      </p>
      <div className="flex items-stretch gap-2">
        <output className="min-w-0 flex-1 select-all break-all rounded-sm border border-border bg-bg px-3 py-2 text-[14px] leading-6 tabular-nums">
          {value}
        </output>
        <Button
          size="sm"
          className="h-auto shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
            } catch {
              // Clipboard blocked: the field is select-all, so a tap plus copy still works.
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Done
        </Button>
        <Button size="sm" variant="ghost" onClick={onRevoke}>
          Revoke instead
        </Button>
      </div>
    </div>
  );
}

function lastUsed(iso: string | null): string {
  if (!iso) return "never used";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "used just now";
  if (m < 60) return `used ${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `used ${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `used ${d} d ago`;
  return `used ${shortDate(iso)}`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
