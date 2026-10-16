import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type ApiKeySummary, api, errorMessage } from "@lymi/client/api";
import { keysQuery } from "@lymi/client/queries";
import { ApiKeyInput, apiKeyLimits, type Scope } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openBrowserAsync } from "expo-web-browser";
import { useState } from "react";
import { AccessibilityInfo, Alert, View } from "react-native";
import { usePalette } from "../../../theme/palette";
import { Chip } from "../../../ui/chip";
import { clipboard } from "../../../ui/clipboard";
import { EmptyState } from "../../../ui/empty-state";
import { Input } from "../../../ui/field";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { Button, Icon, Plate, Text } from "../../../ui/primitives";
import { BarButton, Screen } from "../../../ui/screen";
import { Segmented } from "../../../ui/segmented";
import { Sheet, SheetError, SheetHeading, SheetNote } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";
import { toast } from "../../../ui/toast-host";

const DOCS = "https://lymi.app/docs";

/**
 * Personal API keys for scripts and curl, as the web's Settings has them: the list, a sheet to
 * make one, the key shown once right after, and revoking, which is final, asked in iOS's alert.
 * ADR 0036.
 */
export default function ApiKeys() {
  const { t } = useLingui();
  const qc = useQueryClient();
  const keys = useQuery(keysQuery);
  const failed = useLoadFailed(keys);
  const [making, setMaking] = useState(false);
  const [fresh, setFresh] = useState<{ id: string; key: string; name: string } | null>(null);

  const create = useMutation({
    mutationFn: (input: ApiKeyInput) => api.createKey(input),
    onSuccess: (created, input) => {
      setFresh({ id: created.id, key: created.key, name: created.name ?? input.name });
      setMaking(false);
      void qc.invalidateQueries({ queryKey: ["keys"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeKey(id),
    onSuccess: (_r, id) => {
      if (fresh?.id === id) setFresh(null);
      void qc.invalidateQueries({ queryKey: ["keys"] });
    },
    onError: (e) => toast.add({ title: errorMessage(e), error: true }),
  });
  const askRevoke = (id: string, name: string) =>
    Alert.alert(
      t`Revoke “${name}”?`,
      t`Scripts using it stop working at once. This can’t be undone.`,
      [
        { text: t`Keep key`, style: "cancel" },
        { text: t`Revoke key`, style: "destructive", onPress: () => revoke.mutate(id) },
      ],
    );

  // The new key has its own plate above; listing it as well reads as two keys.
  const rest = (keys.data ?? []).filter((k) => k.id !== fresh?.id);
  const empty = keys.isSuccess && rest.length === 0;

  return (
    <Screen
      title={t`API keys`}
      back={{ label: t`You`, to: "/you" }}
      description={t`For scripts and curl. For AI apps, use Connected apps instead.`}
      actions={<BarButton icon="plus" label={t`New key`} onPress={() => setMaking(true)} />}
    >
      {fresh && (
        <FreshKey
          name={fresh.name}
          value={fresh.key}
          onDone={() => setFresh(null)}
          onRevoke={() => askRevoke(fresh.id, fresh.name)}
        />
      )}

      {failed ? (
        <LoadFailed
          query={keys}
          failed={t`Couldn’t load your keys`}
          offline={t`Your keys need a connection`}
        />
      ) : !keys.data ? (
        <Skeleton height={64} />
      ) : empty ? (
        !fresh && (
          <EmptyState
            kind="start"
            icon="keys"
            title={t`No keys yet`}
            body={t`Lets a script read or add to your decks.`}
            action={{ label: t`New key`, onPress: () => setMaking(true) }}
          />
        )
      ) : (
        <Plate className="overflow-hidden">
          {rest.map((key, i) => (
            <KeyRow
              key={key.id}
              item={key}
              first={i === 0}
              revoking={revoke.isPending && revoke.variables === key.id}
              onRevoke={() => askRevoke(key.id, key.name ?? t`Untitled key`)}
            />
          ))}
        </Plate>
      )}

      <View className="gap-2">
        <Text className="px-1 text-base text-muted">
          {t`Read lists decks and cards. Read and write also adds, edits and archives them. A key never grades reviews.`}
        </Text>
        <View className="flex-row flex-wrap">
          <Button
            label={t`Quickstart`}
            variant="ghost"
            size="sm"
            icon="web"
            onPress={() => void openBrowserAsync(`${DOCS}/quickstart`)}
          />
          <Button
            label={t`API reference`}
            variant="ghost"
            size="sm"
            icon="web"
            onPress={() => void openBrowserAsync(`${DOCS}/api`)}
          />
        </View>
      </View>

      <NewKeySheet
        open={making}
        onOpenChange={(open) => {
          setMaking(open);
          if (!open) create.reset();
        }}
        pending={create.isPending}
        error={create.isError ? errorMessage(create.error) : undefined}
        onSubmit={(input) => create.mutate(input)}
      />
    </Screen>
  );
}

/** A key's name, what it may do, how it starts, and when it was last used. */
function KeyRow({
  item,
  first,
  revoking,
  onRevoke,
}: {
  item: ApiKeySummary;
  first: boolean;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const { t, i18n } = useLingui();
  const name = item.name ?? t`Untitled key`;
  const used = lastUsed(i18n, item.lastRequest);
  const created = shortDate(i18n, item.createdAt);
  return (
    <View
      className={`min-h-[64px] flex-row items-center gap-3 py-3 ps-4 pe-2 ${first ? "" : "border-t border-edge"}`}
    >
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="shrink text-md font-medium text-text" numberOfLines={1}>
            {name}
          </Text>
          <Chip size="sm">{item.scope === "write" ? t`Read and write` : t`Read`}</Chip>
        </View>
        <Text className="text-sm text-muted" numberOfLines={2}>
          {item.start ? `${item.start}… · ` : ""}
          {t`${used} · created ${created}`}
        </Text>
      </View>
      <Button label={t`Revoke`} variant="ghost" size="sm" loading={revoking} onPress={onRevoke} />
    </View>
  );
}

/** The one moment a key is handed over: copy it now, since it is never shown again. */
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
  const p = usePalette();
  const [copied, setCopied] = useState(false);
  return (
    <Plate className="gap-3 p-4">
      <View className="flex-row items-start gap-3">
        <View className="size-9 items-center justify-center rounded-full bg-good-soft">
          <Icon name="keys" size={18} colour={p.good} />
        </View>
        <Text className="flex-1 text-base text-text" accessibilityLiveRegion="polite">
          {t`${name} is ready. Copy it now. You won’t see it again.`}
        </Text>
      </View>
      <View className="rounded-md bg-plate-2 px-3 py-2.5">
        <Text
          selectable
          className="text-sm text-text"
          style={{ fontFamily: "Menlo" }}
          accessibilityLabel={t`API key for ${name}`}
        >
          {value}
        </Text>
      </View>
      {clipboard && (
        <Button
          label={copied ? t`Copied` : t`Copy key`}
          icon={copied ? "check" : "copy"}
          variant="primary"
          onPress={() => {
            clipboard?.setString(value);
            setCopied(true);
            AccessibilityInfo.announceForAccessibility(t`Copied`);
          }}
        />
      )}
      <View className="flex-row gap-2">
        <Button label={t`Done`} variant="ghost" size="sm" onPress={onDone} />
        <Button label={t`Revoke instead`} variant="ghost" size="sm" onPress={onRevoke} />
      </View>
    </Plate>
  );
}

/** A name and what the key may do, in a sheet whose ✓ creates it. */
function NewKeySheet({
  open,
  onOpenChange,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error?: string | undefined;
  onSubmit: (input: ApiKeyInput) => void;
}) {
  const { t } = useLingui();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("read");
  const [invalid, setInvalid] = useState<string | null>(null);
  const scopes: { value: Scope; label: string }[] = [
    { value: "read", label: t`Read` },
    { value: "write", label: t`Read and write` },
  ];
  const submit = () => {
    if (pending) return;
    const parsed = ApiKeyInput.safeParse({ name: name.trim(), scope });
    if (!parsed.success) {
      // Mirrors the schema: an empty name fails the minimum, a typed one the maximum.
      setInvalid(
        name.trim()
          ? t`Keep the name under 32 characters.`
          : t`Name the key, so you know which one to revoke later.`,
      );
      return;
    }
    setInvalid(null);
    onSubmit(parsed.data);
  };
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => {
        setName("");
        setScope("read");
        setInvalid(null);
      }}
      title={t`New key`}
      save={{ label: t`Create key`, onPress: submit, busy: pending }}
    >
      <Input
        value={name}
        onChangeText={(next) => {
          setName(next);
          setInvalid(null);
        }}
        accessibilityLabel={t`Name`}
        placeholder={t`Backup script on the laptop`}
        maxLength={apiKeyLimits.name ?? undefined}
        autoFocus
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {invalid ? (
        <SheetError>{invalid}</SheetError>
      ) : (
        <SheetNote>{t`So you know which key to revoke later.`}</SheetNote>
      )}
      <SheetHeading>{t`Access`}</SheetHeading>
      <Segmented value={scope} options={scopes} onChange={setScope} label={t`Access`} />
      <SheetNote>
        {scope === "write"
          ? t`Also adds, edits and archives them. A key never grades reviews.`
          : t`Lists and searches decks and cards. A key never grades reviews.`}
      </SheetNote>
      {error && <SheetError>{error}</SheetError>}
    </Sheet>
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
  return i18n.date(new Date(iso), { day: "numeric", month: "short" });
}
