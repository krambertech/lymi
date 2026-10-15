import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, type Section, type Sections } from "@lymi/client/api";
import { sectionsQuery } from "@lymi/client/queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { Alert, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { usePalette } from "../theme/palette";
import { ActionMenu } from "../ui/action-menu";
import { Icon } from "../ui/icons";
import type { MenuItem } from "../ui/menu";
import { Button, Text } from "../ui/primitives";
import { RowMenu, type RowMenuItem } from "../ui/row-menu";
import { toast } from "../ui/toast-host";

/**
 * Starting a section, as the web's deck page does: one with locked sections before it asks first,
 * since they start too, and starting is never undone.
 */
export function useStartSection(deckId: string, sections: readonly Section[]) {
  const { t } = useLingui();
  const qc = useQueryClient();
  const start = useMutation({
    mutationFn: (section: Section) => api.startSection(section.id),
    onSuccess: (next) => qc.setQueryData<Sections>(sectionsQuery(deckId).queryKey, next),
    onError: () => toast.add({ error: true, title: t`Couldn’t start the section` }),
    onSettled: () =>
      Promise.all(
        ["decks", "series", "queue", "rounds"].map((key) =>
          qc.invalidateQueries({ queryKey: [key] }),
        ),
      ),
  });

  const ask = (section: Section) => {
    const at = sections.findIndex((s) => s.id === section.id);
    const opening = sections
      .slice(0, at + 1)
      .filter((s) => s.status !== "open" && (s.total > 0 || s.id === section.id));
    if (opening.length <= 1) return start.mutate(section);
    const others = opening.length - 1;
    const cards = opening.reduce((sum, s) => sum + s.total, 0);
    const sectionName = section.name;
    Alert.alert(
      t`Start ${sectionName} early?`,
      [
        plural(others, {
          one: "The section before it starts too, so sections stay in order.",
          other: "The # sections before it start too, so sections stay in order.",
        }),
        plural(cards, {
          one: "# card is added to your reviews.",
          other: "# cards are added to your reviews.",
        }),
      ].join(" "),
      [
        { text: t`Cancel`, style: "cancel" },
        {
          text: plural(opening.length, { one: "Start section", other: "Start # sections" }),
          isPreferred: true,
          onPress: () => start.mutate(section),
        },
      ],
    );
  };

  return { start: ask, starting: start.isPending ? start.variables?.id : undefined };
}

/**
 * Where the learner is in a deck whose sections open in order, under the deck's summary: the
 * section they are on and the one next step. It says what opens the next section in cards, never
 * as a percentage. The web's SectionProgress.
 */
export function SectionProgress({
  sections,
  progress,
  due,
  starting,
  onStart,
}: {
  sections: readonly Section[];
  progress: NonNullable<Sections["progress"]>;
  /** Cards to review now, so Start takes the amber only when Review does not have it. */
  due: number;
  starting: string | undefined;
  onStart: (section: Section) => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const current = sections.find((s) => s.id === progress.currentId);
  const next = sections.find((s) => s.id === progress.nextId);
  if (!current) return null;

  const currentName = current.name;
  const nextName = next?.name ?? "";
  const known = i18n.number(current.known);
  const needed = i18n.number(current.knownNeeded);
  let title: string;
  let detail: string;
  if (!next) {
    title = t`Every section is open`;
    detail = plural(current.total, {
      one: `You know ${known} of # card in ${currentName}, the last section.`,
      other: `You know ${known} of # cards in ${currentName}, the last section.`,
    });
  } else if (progress.ready) {
    title = t`${nextName} is ready`;
    detail = plural(current.total, {
      one: `You know ${known} of # card in ${currentName}.`,
      other: `You know ${known} of # cards in ${currentName}.`,
    });
  } else if (current.notStarted > 0 && current.known >= current.knownNeeded) {
    title = currentName;
    detail = plural(current.notStarted, {
      one: "The next section opens once the last card of this section comes up in review.",
      other: "The next section opens once the last # cards of this section come up in review.",
    });
  } else {
    title = currentName;
    detail = plural(current.total, {
      one: `The next section opens when you know ${needed} of # card.`,
      other: `The next section opens when you know ${needed} of # cards.`,
    });
  }

  const meter = !!next && !progress.ready && current.total > 0;
  const share = current.total > 0 ? Math.min(1, current.known / current.total) : 0;
  const tick = current.total > 0 ? Math.min(1, current.knownNeeded / current.total) : 0;

  return (
    <View className="gap-3 border-t border-edge pt-4">
      <View className="gap-0.5">
        <Text className="text-md font-medium text-text">{title}</Text>
        <Text className="text-sm text-text-2">{detail}</Text>
      </View>
      {meter && (
        <View className="h-1.5 justify-center" accessibilityElementsHidden>
          <View className="h-1.5 overflow-hidden rounded-full bg-plate-2">
            <View
              className="h-full rounded-full bg-state-known"
              style={{ width: `${share * 100}%` }}
            />
          </View>
          <View
            className="absolute w-0.5 rounded-full"
            style={{
              start: `${tick * 100}%`,
              top: -4,
              bottom: -4,
              marginStart: -1,
              backgroundColor: p["text-2"],
            }}
          />
        </View>
      )}
      {next && progress.ready && (
        <Button
          label={t`Start ${nextName}`}
          variant={due > 0 ? "secondary" : "primary"}
          loading={starting === next.id}
          onPress={() => onStart(next)}
        />
      )}
    </View>
  );
}

/**
 * A section's heading in the deck's list: how much of it the learner knows, or a lock while it
 * waits, its name and count, You are here on the section they are on, and a menu that starts it
 * early or reviews only its cards.
 */
export function SectionHeading({
  deckId,
  section,
  count,
  here,
  starting,
  onStart,
  owner,
  several,
}: {
  deckId: string;
  section: Section;
  count: number;
  here: boolean;
  starting: boolean;
  onStart: (section: Section) => void;
  /** The deck's owner also renames and reorders its sections. */
  owner: boolean;
  /** More than one section, so there is an order to change. */
  several: boolean;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const router = useRouter();
  const locked = section.status !== "open";
  // A card started early in a section that is not open is still in review, so it counts here too.
  const reviewable = section.due > 0;
  const sectionName = section.name;
  const sectionsPage = `/library/sections?id=${deckId}`;
  // The ⋯ and a long press offer the same rows.
  const rows: (MenuItem & Pick<RowMenuItem, "id" | "icon">)[][] = [
    [
      ...(section.status === "locked"
        ? [
            {
              id: "start_section" as const,
              label: t`Start anyway`,
              icon: "unlock" as const,
              onSelect: () => onStart(section),
            },
          ]
        : []),
      ...(reviewable
        ? [
            {
              id: "review" as const,
              label: t`Review this section`,
              icon: "play" as const,
              onSelect: () => router.push(`/review?deck=${deckId}&section=${section.id}` as Href),
            },
          ]
        : []),
    ],
    owner
      ? [
          {
            id: "rename_section" as const,
            label: t`Rename section`,
            icon: "edit" as const,
            onSelect: () => router.push(`${sectionsPage}&rename=${section.id}` as Href),
          },
          ...(several
            ? [
                {
                  id: "reorder_sections" as const,
                  label: t`Reorder sections`,
                  icon: "grip" as const,
                  onSelect: () => router.push(`${sectionsPage}&edit=1` as Href),
                },
              ]
            : []),
        ]
      : [],
  ].filter((group) => group.length > 0);
  const items: MenuItem[][] = rows;
  const heading = (
    <View className="flex-row items-start gap-2.5 bg-canvas px-1 pb-3 pt-2">
      <View className="h-7 justify-center">
        {locked ? (
          <Icon name="lock" size={16} colour={p.muted} />
        ) : (
          <SectionRing known={section.known} total={section.total} />
        )}
      </View>
      <View className="flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
        <Text
          className={`text-lg font-medium ${locked ? "text-text-2" : "text-text"}`}
          accessibilityRole="header"
          accessibilityLabel={
            locked
              ? plural(count, {
                  one: `${sectionName}, not open yet, # card`,
                  other: `${sectionName}, not open yet, # cards`,
                })
              : plural(count, { one: `${sectionName}, # card`, other: `${sectionName}, # cards` })
          }
        >
          {sectionName}
          <Text
            className="text-base font-normal text-muted"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {`  ${i18n.number(count)}`}
          </Text>
        </Text>
        {here && (
          // Green, not amber: it says where the learner is and asks for nothing.
          <View className="h-6 flex-row items-center gap-1 rounded-full bg-good pe-2.5 ps-1.5">
            <Icon name="here" size={13} colour={p.canvas} strokeWidth={2.25} />
            <Text className="text-sm font-medium" style={{ color: p.canvas }}>
              {t`You are here`}
            </Text>
          </View>
        )}
      </View>
      {items.length > 0 && (
        <ActionMenu
          items={items}
          label={t`Options for ${sectionName}`}
          symbol="ellipsis"
          look="row"
          disabled={starting}
        />
      )}
    </View>
  );
  if (items.length === 0) return heading;
  const headingLabel = locked
    ? plural(count, {
        one: `${sectionName}, not open yet, # card`,
        other: `${sectionName}, not open yet, # cards`,
      })
    : plural(count, { one: `${sectionName}, # card`, other: `${sectionName}, # cards` });
  return (
    <RowMenu
      surface="section_heading"
      href={`/library/${deckId}` as Href}
      kind="heading"
      label={here ? `${headingLabel}, ${t`You are here`}` : headingLabel}
      items={rows}
    >
      {heading}
    </RowMenu>
  );
}

/** "Lesson 3 is ready", in the list above its cards, with the same Start as the summary. */
export function ReadyNote({
  section,
  starting,
  onStart,
}: {
  section: Section;
  starting: boolean;
  onStart: (section: Section) => void;
}) {
  const { t } = useLingui();
  const sectionName = section.name;
  return (
    <View className="mb-1 mt-2 gap-3 rounded-lg bg-plate-2 p-4">
      <Text className="text-base text-text-2">
        {t`${sectionName} is ready. Start it to review its cards.`}
      </Text>
      <Button
        label={t`Start ${sectionName}`}
        size="sm"
        loading={starting}
        onPress={() => onStart(section)}
      />
    </View>
  );
}

// The pie is a stroke as wide as its own diameter, so a dash of the circumference fills a wedge.
const PIE_R = 1.75;
const PIE = 2 * Math.PI * PIE_R;

/** How much of a section the learner knows, as a ring that fills clockwise and closes with a check. */
export function SectionRing({ known, total }: { known: number; total: number }) {
  const { i18n } = useLingui();
  const p = usePalette();
  const share = total > 0 ? Math.min(1, known / total) : 0;
  const done = total > 0 && known >= total;
  const colour = share > 0 ? p["state-known"] : p.muted;
  const knownN = i18n.number(known);
  return (
    <View
      accessible
      accessibilityLabel={plural(total, {
        one: `You know ${knownN} of # card`,
        other: `You know ${knownN} of # cards`,
      })}
    >
      <Svg width={16} height={16} viewBox="0 0 16 16">
        {done ? (
          <>
            <Circle cx="8" cy="8" r="7" fill={colour} />
            <Path
              d="m5 8.25 2 2 4-4.25"
              fill="none"
              stroke={p.canvas}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <Circle cx="8" cy="8" r="6.25" fill="none" stroke={colour} strokeWidth={1.5} />
            <Circle
              cx="8"
              cy="8"
              r={PIE_R}
              fill="none"
              stroke={colour}
              strokeWidth={PIE_R * 2}
              strokeDasharray={`${share * PIE} ${PIE}`}
              transform="rotate(-90 8 8)"
            />
          </>
        )}
      </Svg>
    </View>
  );
}
