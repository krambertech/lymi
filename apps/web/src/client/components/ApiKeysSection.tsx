import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ApiKeyInput, type Scope } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { type ApiKeySummary, api, errorMessage } from "../lib/api";
import { type FieldErrors, fieldErrors, focusFirstInvalid } from "../lib/form";
import { publicSiteUrl } from "../lib/origins";
import { keysQuery } from "../lib/queries";
import { Button, buttonClass } from "./Button";
import { Chip } from "./Chip";
import { DocLink } from "./ConnectedAppsSection";
import { CopyField } from "./CopyField";
import { EmptySection } from "./EmptyState";
import { Lantern } from "./Lantern";
import { Segmented } from "./Segmented";
import { SettingsGroup } from "./SettingsGroup";
import { Skeleton } from "./Skeleton";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

/**
 * Personal API keys for curl and scripts. The list is the point of the section; making a key
 * is a sheet, like every other short form in the app. The key itself is shown once, right
 * after it is made, and revoking is final, so it takes a second tap, inline, no dialog.
 */
export function ApiKeysSection() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const keys = useQuery(keysQuery);
  const [making, setMaking] = useState(false);
  const [fresh, setFresh] = useState<{ id: string; key: string; name: string } | null>(null);

  const create = useMutation({
    mutationFn: (input: ApiKeyInput) => api.createKey(input),
    onSuccess: (created, input) => {
      setFresh({ id: created.id, key: created.key, name: created.name ?? input.name });
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
    <SettingsGroup
      title={t`API keys`}
      description={t`For scripts and curl. An assistant signs in instead, under Connected apps.`}
    >
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

      {empty && !fresh && (
        <EmptySection
          icon={<KeyRound />}
          title={t`No keys yet`}
          body={t`A key lets a script or curl read your decks, or add to them.`}
          action={
            <>
              <Button variant="primary" onClick={() => setMaking(true)}>
                <Plus aria-hidden="true" />
                <Trans>New key</Trans>
              </Button>
              <a href={publicSiteUrl("/docs/quickstart")} className={buttonClass("secondary")}>
                <Trans>Read the quickstart</Trans>
              </a>
            </>
          }
        />
      )}

      {rest.length > 0 && (
        <p className="max-w-[60ch] text-sm text-muted">
          <Trans>
            Read lists decks and cards. Read and write also adds, edits and archives them. A key
            never grades reviews. <DocLink href={publicSiteUrl("/docs/api")}>API reference</DocLink>
          </Trans>
        </p>
      )}

      {!(empty && !fresh) && (
        <Button className="w-fit" onClick={() => setMaking(true)}>
          <Plus aria-hidden="true" />
          <Trans>New key</Trans>
        </Button>
      )}

      <Dialog open={making} onOpenChange={setMaking}>
        <DialogContent className="w-[min(92vw,440px)]">
          <DialogTitle>{t`New key`}</DialogTitle>
          <NewKeyForm
            key={making ? "open" : "closed"}
            pending={create.isPending}
            error={create.isError ? errorMessage(create.error) : undefined}
            onCancel={() => {
              setMaking(false);
              create.reset();
            }}
            onSubmit={(input) => create.mutate(input)}
          />
        </DialogContent>
      </Dialog>
    </SettingsGroup>
  );
}

function NewKeyForm({
  pending,
  error,
  onCancel,
  onSubmit,
}: {
  pending: boolean;
  error?: string | undefined;
  onCancel: () => void;
  onSubmit: (input: ApiKeyInput) => void;
}) {
  const { t } = useLingui();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("read");
  const [invalid, setInvalid] = useState<FieldErrors>({});
  const scopes: { value: Scope; label: string; hint: string }[] = [
    { value: "read", label: t`Read`, hint: t`Lists and searches decks and cards.` },
    { value: "write", label: t`Read and write`, hint: t`Also adds, edits and archives them.` },
  ];

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const parsed = ApiKeyInput.safeParse({ name: name.trim(), scope });
        if (!parsed.success) {
          // Mirrors the schema: an empty name fails the minimum, a typed one the maximum.
          setInvalid(
            fieldErrors(parsed.error, {
              name: name.trim()
                ? t`Keep the name under 32 characters.`
                : t`Name the key, so you know which one to revoke later.`,
            }),
          );
          focusFirstInvalid(e.currentTarget);
          return;
        }
        setInvalid({});
        onSubmit(parsed.data);
      }}
    >
      <Field>
        <FieldLabel>{t`Name`}</FieldLabel>
        <Input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalid(({ name: _, ...rest }) => rest);
          }}
          maxLength={32}
          placeholder={t`Backup script on the laptop`}
          autoComplete="off"
          enterKeyHint="done"
        />
        {invalid.name ? (
          <FieldError>{invalid.name}</FieldError>
        ) : (
          <FieldDescription>{t`So you know which key to revoke later.`}</FieldDescription>
        )}
      </Field>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium text-text-2">
          <Trans>Access</Trans>
        </span>
        <Segmented value={scope} onChange={setScope} options={scopes} label={t`Access`} />
        <p className="text-sm text-muted">
          {scopes.find((s) => s.value === scope)?.hint} <Trans>A key never grades reviews.</Trans>
        </p>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <p className="flex-1 text-sm text-danger" role="status">
          {error}
        </p>
        <Button variant="ghost" onClick={onCancel} aria-disabled={pending}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" type="submit" loading={pending}>
          <Trans>Create key</Trans>
        </Button>
      </div>
    </form>
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
  const { t, i18n } = useLingui();
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
          <span className="truncate text-base font-medium">{item.name ?? t`Untitled key`}</span>
          <Chip size="sm">{item.scope === "write" ? t`Read and write` : t`Read`}</Chip>
        </div>
        <p className="text-sm text-muted">
          {item.start && <span className="font-mono">{item.start}…</span>}
          {item.start && " · "}
          <span className="tabular-nums">
            <Trans>
              {lastUsed(i18n, item.lastRequest)} · created {shortDate(i18n, item.createdAt)}
            </Trans>
          </span>
        </p>
      </div>
      {confirming ? (
        <div className="enter-fade flex gap-3">
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            <Trans>Keep key</Trans>
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={revoking}
            aria-disabled={revoking}
            onClick={onRevoke}
          >
            <Trans>Revoke key</Trans>
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          <Trans>Revoke</Trans>
        </Button>
      )}
    </li>
  );
}

/**
 * The one moment in Settings where something is handed over. The lantern takes one breath, the
 * way it does when a review lands, and the key is the only thing on the panel worth pressing.
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
  const { t } = useLingui();
  const [fed, setFed] = useState(0);
  useEffect(() => setFed(1), []);

  return (
    <div className="enter-card edge grid gap-3 rounded-md bg-plate p-4" role="status">
      <div className="flex items-start gap-2.5">
        <Lantern className="size-8 shrink-0" glow fed={fed} />
        <p className="text-base text-text">
          <Trans>
            <span className="font-medium">{name}</span> is ready. Copy it now. It is not shown
            again.
          </Trans>
        </p>
      </div>
      <CopyField value={value} label={t`API key for ${name}`} />
      <div className="flex gap-3">
        <Button size="sm" variant="ghost" onClick={onDone}>
          <Trans>Done</Trans>
        </Button>
        <Button size="sm" variant="ghost" onClick={onRevoke}>
          <Trans>Revoke instead</Trans>
        </Button>
      </div>
    </div>
  );
}

function lastUsed(i18n: I18n, iso: string | null): string {
  if (!iso) return i18n._(msg`never used`);
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return i18n._(msg`used just now`);
  if (m < 60) return i18n._(msg`used ${m} min ago`);
  const h = Math.round(m / 60);
  if (h < 24) return i18n._(msg`used ${h} h ago`);
  const d = Math.round(h / 24);
  if (d < 14) return i18n._(msg`used ${d} d ago`);
  const date = shortDate(i18n, iso);
  return i18n._(msg`used ${date}`);
}

function shortDate(i18n: I18n, iso: string): string {
  return i18n.date(iso, { day: "numeric", month: "short" });
}
