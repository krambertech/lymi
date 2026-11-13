import { useLingui } from "@lingui/react/macro";
import type { ApiKeySummary, ConnectedApp, Readwise } from "@lymi/client/api";
import { listedApp } from "@lymi/client/app-marks";
import type { Assistant } from "@lymi/client/apps";
import { type Href, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { clear, usePalette } from "../theme/palette";
import { Icon, Plate, Press, RowArrow, SectionTitle, Text } from "../ui/primitives";
import { lastUsed, shortDate } from "../you/key-dates";
import { ASSISTANTS, appPageParams, identityOf } from "./catalog";
import { AppGlyph, AppMark, CustomMark, ReadwiseMark, UnverifiedChip, YomitanMark } from "./marks";

interface Props {
  consents: ConnectedApp[];
  readwise: Readwise | null;
  yomitan: ApiKeySummary | null;
  /** The assistants not yet connected, Custom MCP last. */
  toAdd: readonly Assistant[];
}

/** One app to add: where its page is, its name and its glyph. */
type Addable = { key: string; to: Href; name: string; glyph: ReactNode };

function useAddable(
  assistants: readonly Assistant[],
  readwise: boolean,
  yomitan: boolean,
): Addable[] {
  const { t } = useLingui();
  return [
    ...assistants.flatMap(({ key, app }) =>
      key !== "custom" && app
        ? [
            {
              key,
              to: `/you/apps/${key}` as Href,
              name: app.name ?? key,
              glyph: <AppGlyph app={app} />,
            },
          ]
        : [],
    ),
    ...(readwise
      ? [
          {
            key: "readwise",
            to: "/you/apps/readwise" as Href,
            name: "Readwise",
            glyph: <ReadwiseMark size={16} bare />,
          },
        ]
      : []),
    ...(yomitan
      ? [
          {
            key: "yomitan",
            to: "/you/apps/yomitan" as Href,
            name: "Yomitan",
            glyph: <YomitanMark size={16} bare />,
          },
        ]
      : []),
    {
      key: "custom",
      to: "/you/apps/custom" as Href,
      name: t`Custom MCP`,
      glyph: <CustomMark size={16} bare />,
    },
  ];
}

/**
 * Every app that adds cards: the connected ones as rows on a plate, then the rest as chips under
 * Add an app. Each opens its own page. docs/design/app-pages.md.
 */
export function AppsList({ consents, readwise, yomitan, toAdd }: Props) {
  const { t } = useLingui();
  const items = useAddable(toAdd, !readwise, !yomitan);
  if (consents.length === 0 && !readwise && !yomitan) return <Empty />;
  const pages = appPageParams(consents);
  return (
    <>
      <Plate className="overflow-hidden">
        {consents.map((item, i) => (
          <AssistantRow
            key={item.id}
            item={item}
            page={pages.get(item.id) ?? item.id}
            first={i === 0}
          />
        ))}
        {readwise && (
          <Row
            to="/you/apps/readwise"
            mark={<ReadwiseMark />}
            name="Readwise"
            first={consents.length === 0}
          >
            <ReadwiseStatus connection={readwise} />
          </Row>
        )}
        {yomitan && (
          <Row
            to="/you/apps/yomitan"
            mark={<YomitanMark />}
            name="Yomitan"
            first={consents.length === 0 && !readwise}
          >
            <YomitanStatus apiKey={yomitan} />
          </Row>
        )}
      </Plate>
      <View>
        <SectionTitle>{t`Add an app`}</SectionTitle>
        <Chips items={items} />
      </View>
    </>
  );
}

function Chips({ items, centred = false }: { items: Addable[]; centred?: boolean }) {
  const router = useRouter();
  return (
    <View className={`flex-row flex-wrap gap-2 ${centred ? "justify-center" : ""}`}>
      {items.map((item) => (
        <Press
          key={item.key}
          onPress={() => router.push(item.to)}
          accessibilityRole="link"
          accessibilityLabel={item.name}
          className="min-h-11 flex-row items-center gap-2 rounded-full border border-edge bg-plate py-2 ps-3 pe-4"
        >
          {item.glyph}
          <Text className="text-base font-medium text-ink">{item.name}</Text>
        </Press>
      ))}
    </View>
  );
}

/** The fan's tilt, outermost tiles most, so the five read as a hand of apps. */
const FAN = [
  { rotate: "-8deg", y: 4 },
  { rotate: "-4deg", y: 0 },
  { rotate: "0deg", y: -2 },
  { rotate: "4deg", y: 0 },
  { rotate: "8deg", y: 4 },
];

function Fan({ size, ring }: { size: number; ring?: string }) {
  const p = usePalette();
  const claude = ASSISTANTS[0]?.app;
  const chatgpt = ASSISTANTS[1]?.app;
  const gemini = ASSISTANTS[2]?.app;
  const marks = [
    claude && <AppMark app={claude} size={size} />,
    chatgpt && <AppMark app={chatgpt} size={size} />,
    <ReadwiseMark key="readwise" size={size} />,
    gemini && <AppMark app={gemini} size={size} />,
    <YomitanMark key="yomitan" size={size} />,
  ];
  return (
    <View
      className="flex-row"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {marks.map((mark, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: the fan is fixed and never reorders
          key={i}
          style={{
            marginStart: i === 0 ? 0 : -6,
            zIndex: i === 2 ? 2 : 1,
            padding: 2,
            borderRadius: Math.round(size * 0.27) + 2,
            backgroundColor: ring ?? p.plate,
            transform: [{ rotate: FAN[i]?.rotate ?? "0deg" }, { translateY: FAN[i]?.y ?? 0 }],
          }}
        >
          {mark}
        </View>
      ))}
    </View>
  );
}

/**
 * Nothing connected yet: the apps' own marks under a pool of light in the room, what they do, and
 * every one of them to pick.
 */
function Empty() {
  const { t } = useLingui();
  const p = usePalette();
  const items = useAddable(ASSISTANTS, true, true);
  return (
    <View className="items-center gap-6 pt-4">
      <View
        className="items-center gap-5 self-stretch pb-2 pt-10"
        style={{
          experimental_backgroundImage: `radial-gradient(45% 45% at 50% 45%, ${p["amber-soft"]}, ${clear(p["amber-soft"])})`,
        }}
      >
        <Fan size={52} ring={p.canvas} />
        <View className="items-center gap-1 px-2">
          <Text className="text-center text-lg font-medium text-ink" accessibilityRole="header">
            {t`Connect your first app`}
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            {t`An assistant turns a lesson, a PDF or a chat into cards. Readwise and Yomitan add words as you read.`}
          </Text>
        </View>
      </View>
      <Chips items={items} centred />
    </View>
  );
}

function Row({
  to,
  mark,
  name,
  badge,
  first,
  children,
}: {
  to: Href;
  mark: ReactNode;
  name: string;
  /** Beside the name, such as Unverified. */
  badge?: ReactNode;
  first: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Press onPress={() => router.push(to)} scale={0.99} accessibilityRole="link">
      <View
        className={`min-h-[68px] flex-row items-center gap-3 py-3 ps-4 pe-4 ${first ? "" : "border-t border-edge"}`}
      >
        {mark}
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text className="shrink text-md font-medium text-ink" numberOfLines={1}>
              {name}
            </Text>
            {badge && <View className="self-center">{badge}</View>}
          </View>
          {children}
        </View>
        <RowArrow />
      </View>
    </Press>
  );
}

function AssistantRow({ item, page, first }: { item: ConnectedApp; page: string; first: boolean }) {
  const { t, i18n } = useLingui();
  const app = identityOf(item);
  const listed = listedApp(app);
  const connected = i18n.date(new Date(item.createdAt), { day: "numeric", month: "short" });
  return (
    <Row
      to={`/you/apps/${page}` as Href}
      mark={<AppMark app={{ ...app, name: listed.title }} />}
      name={listed.title ?? t`An app`}
      badge={listed.unverified && <UnverifiedChip borrowed={listed.borrowed} />}
      first={first}
    >
      {/* A long host gives up its middle, so the domain that identifies it stays. */}
      <Text className="text-sm text-ink-muted" numberOfLines={1} ellipsizeMode="middle">
        {listed.host ? `${listed.host} · ` : ""}
        {t`connected ${connected}`}
      </Text>
    </Row>
  );
}

function ReadwiseStatus({ connection }: { connection: Readwise }) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  if (connection.status === "unreadable" || connection.status === "refused") {
    return (
      <View className="flex-row items-center gap-1">
        <Icon name="alert" size={13} colour={p.danger} />
        <Text className="flex-1 text-sm text-danger" numberOfLines={2}>
          {connection.status === "unreadable"
            ? t`Lymi needs your Readwise token again`
            : t`Readwise no longer accepts your token`}
        </Text>
      </View>
    );
  }
  const at = connection.lastPull?.at;
  const when = at && i18n.date(new Date(at), { hour: "numeric", minute: "2-digit" });
  return (
    <Text className="text-sm text-ink-muted" numberOfLines={2}>
      {when ? t`Connected. Last checked at ${when}.` : t`Connected. Lymi checks every hour.`}
    </Text>
  );
}

function YomitanStatus({ apiKey }: { apiKey: ApiKeySummary }) {
  const { t, i18n } = useLingui();
  const made = shortDate(i18n, apiKey.createdAt);
  const used = lastUsed(i18n, apiKey.lastRequest);
  return (
    <Text
      className="text-sm text-ink-muted"
      numberOfLines={1}
      style={{ fontVariant: ["tabular-nums"] }}
    >
      {t`Key made ${made} · ${used}`}
    </Text>
  );
}
