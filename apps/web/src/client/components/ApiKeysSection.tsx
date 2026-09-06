import { ApiKeyInput, type Scope } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { type ApiKeySummary, api } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { publicSiteUrl } from "../lib/origins";
import { keysQuery } from "../lib/queries";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { CopyField } from "./CopyField";
import { Field, Input } from "./Field";
import { Lantern } from "./Lantern";
import { Segmented } from "./Segmented";
import { SettingsGroup } from "./SettingsGroup";
import { Skeleton } from "./Skeleton";

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: "read", label: "Read", hint: "Lists and searches decks and cards." },
  { value: "write", label: "Read and write", hint: "Also adds, edits and archives them." },
];

/**
 * Personal API keys for curl, scripts and Claude Code. The list is the point of the section,
 * so the form stays folded until it is wanted; a key already made is what you come here to
 * check on. The key itself is shown once, right after it is made, and revoking is final, so
 * it takes a second tap, inline, no dialog.
 */
export function ApiKeysSection() {
  const qc = useQueryClient();
  const keys = useQuery(keysQuery);
  const [making, setMaking] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("read");
  const [fresh, setFresh] = useState<{ id: string; key: string; name: string } | null>(null);
  const [invalid, setInvalid] = useState<FieldErrors>({});

  const create = useMutation({
    mutationFn: () => api.createKey({ name: name.trim(), scope }),
    onSuccess: (created) => {
      setFresh({ id: created.id, key: created.key, name: created.name ?? name.trim() });
      setName("");
      setScope("read");
      setMaking(false);
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

  // The new key has its own panel above; listing it as well reads as two keys.
  const rest = (keys.data ?? []).filter((k) => k.id !== fresh?.id);
  const empty = keys.isSuccess && rest.length === 0;

  return (
    <SettingsGroup title="API keys">
      <p className="max-w-[62ch] text-base text-text-2">
        For curl, scripts and Claude Code. Send the key in an{" "}
        <code className="font-mono text-sm">x-api-key</code> header; the routes are in the{" "}
        <a
          href={publicSiteUrl("/docs/api")}
          className="underline decoration-edge-2 underline-offset-2 hoverable:hover:decoration-current"
        >
          API reference
        </a>
        . MCP clients such as Claude Desktop sign in instead, and appear under Connected apps.
      </p>

      {fresh && (
        <FreshKey
          name={fresh.name}
          value={fresh.key}
          onDone={() => setFresh(null)}
          onRevoke={() => revoke.mutate(fresh.id)}
        />
      )}

      {keys.isPending && <Skeleton className="h-14 w-full" />}

      {rest.length > 0 && (
        <ul className="grid">
          {rest.map((k) => (
            <KeyRow
              key={k.id}
              item={k}
              revoking={revoke.isPending && revoke.variables === k.id}
              onRevoke={() => revoke.mutate(k.id)}
            />
          ))}
        </ul>
      )}

      {empty && !making && !fresh && (
        <p className="text-base text-muted">
          No keys yet. Make one when you want to reach Lymi from a script.
        </p>
      )}

      {making ? (
        <form
          className="enter-card edge grid gap-4 rounded-md bg-plate p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (create.isPending) return;
            const parsed = ApiKeyInput.safeParse({ name, scope });
            if (!parsed.success) {
              setInvalid(fieldErrors(parsed.error));
              focusFirstInvalid(e.currentTarget);
              return;
            }
            setInvalid({});
            create.mutate();
          }}
        >
          <Field
            label="Name"
            hint="So you know which key to revoke later."
            error={invalid.name}
            className="max-w-sm"
          >
            {/* Focus follows the button that revealed the field, so it is not a surprise. */}
            <Input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setInvalid(({ name: _, ...rest }) => rest);
              }}
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
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" loading={create.isPending}>
              Create key
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-disabled={create.isPending}
              onClick={() => {
                setMaking(false);
                setName("");
                create.reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" className="w-fit" onClick={() => setMaking(true)}>
          <Plus aria-hidden="true" />
          New key
        </Button>
      )}
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
        <p className="text-sm text-muted">
          {item.start && <span className="font-mono">{item.start}…</span>}
          {item.start && " · "}
          <span className="tabular-nums">
            {lastUsed(item.lastRequest)} · created {shortDate(item.createdAt)}
          </span>
        </p>
      </div>
      {confirming ? (
        <div className="enter-fade flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={revoking}
            aria-disabled={revoking}
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

/**
 * The one moment in Settings where something is handed over. The lantern flares once, the
 * way it does when a card lands, and the key is the only thing on the panel worth pressing.
 */
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
  const [flare, setFlare] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFlare(false), 420);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="enter-card edge grid gap-3 rounded-md bg-plate p-4" role="status">
      <div className="flex items-start gap-2.5">
        <Lantern className="size-8 shrink-0" glow flare={flare} />
        <p className="text-base text-text">
          <span className="font-medium">{name}</span> is ready. Copy it now — it is not shown again.
        </p>
      </div>
      <CopyField value={value} label={`API key for ${name}`} />
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
