import type { Scope } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type ApiKeySummary, api } from "../lib/api";
import { keysQuery } from "../lib/queries";
import { SettingsGroup } from "../views/YouView";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Field, Input } from "./Field";
import { Segmented } from "./Segmented";

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
    <SettingsGroup title="API keys">
      <p className="max-w-[60ch] text-base text-text-2">
        For curl, scripts and Claude Code. Send the key in an <code>x-api-key</code> header; the
        routes are in the{" "}
        <a
          href="/docs/api"
          className="underline decoration-edge-2 underline-offset-2 hoverable:hover:decoration-current"
        >
          API reference
        </a>
        . MCP clients such as Claude Desktop sign in with OAuth instead and do not need one.
      </p>

      {fresh && (
        <FreshKey
          name={fresh.name}
          value={fresh.key}
          onDone={() => setFresh(null)}
          onRevoke={() => revoke.mutate(fresh.id)}
        />
      )}

      {keys.isSuccess && keys.data.length === 0 && !fresh && (
        <p className="text-base text-muted">No keys yet.</p>
      )}

      {keys.data && keys.data.length > 0 && (
        <ul className="grid">
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
        className="grid gap-4 border-t border-edge pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (canCreate) create.mutate();
        }}
      >
        <Field label="Name" className="max-w-sm">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            placeholder="Claude Code on the laptop"
            autoComplete="off"
          />
        </Field>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-text-2">Access</span>
          <Segmented value={scope} onChange={setScope} options={SCOPES} label="Access" />
          <p className="text-sm text-muted">
            {SCOPES.find((s) => s.value === scope)?.hint} Keys never grade reviews.
          </p>
        </div>
        {create.isError && (
          <p className="text-sm text-danger" role="alert">
            {(create.error as Error).message}
          </p>
        )}
        <Button type="submit" size="sm" className="w-fit" disabled={!canCreate}>
          Create key
        </Button>
      </form>
    </SettingsGroup>
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
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-medium">{item.name ?? "Untitled key"}</span>
          <Chip size="sm">{item.scope === "write" ? "Read and write" : "Read"}</Chip>
        </div>
        <p className="text-sm text-muted tabular-nums">
          {item.start}… · {lastUsed(item.lastRequest)} · created {shortDate(item.createdAt)}
        </p>
      </div>
      {confirming ? (
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={revoking}
            disabled={revoking}
            onClick={onRevoke}
          >
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
    <div className="edge grid gap-3 rounded-md bg-plate p-4" role="status">
      <p className="text-base">
        <span className="font-medium">{name}</span> is ready. Copy it now; it is not shown again.
      </p>
      <div className="flex items-stretch gap-2">
        <output className="edge min-w-0 flex-1 select-all break-all rounded-sm bg-plate-2 px-3 py-2 text-base leading-6 tabular-nums">
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
