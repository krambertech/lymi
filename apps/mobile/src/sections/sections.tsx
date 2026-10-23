import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Section, type Sections } from "@lymi/client/api";
import { sectionsQuery } from "@lymi/client/queries";
import { type SectionActionId, sectionActions } from "@lymi/client/section-actions";
import { isolate } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { Alert, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { captureEvent } from "../telemetry/posthog";
import { usePalette } from "../theme/palette";
import { ActionMenu } from "../ui/action-menu";
import { Icon } from "../ui/icons";
import type { MenuItem } from "../ui/menu";
import { Button, Press, Text } from "../ui/primitives";
import { RowMenu, type RowMenuItem } from "../ui/row-menu";
import { toast } from "../ui/toast-host";
import { sectionPage } from "./section-line";

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
      t`Start ${{ sectionName: isolate(sectionName) }} early?`,
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

/** What a section's menu does, wherever it opens: a heading's ⋯, its long press, or its page's ⋯. */
export interface SectionMenuHandlers {
  onStart: (section: Section) => void;
  onSelectCards: (section: Section) => void;
  onArchive: (section: Section) => void;
}

/**
 * A section's actions as menu rows, from the list both apps share, so every place offers the same
 * rows in the same order.
 */
export function useSectionMenu(
  deckId: string,
  {
    owner,
    several,
    selecting,
  }: {
    owner: boolean;
    several: boolean;
    /** A selection is open, so Select cards would replace it. */
    selecting: boolean;
  },
  handlers: SectionMenuHandlers,
) {
  const { t } = useLingui();
  const router = useRouter();
  const sectionsPage = `/library/sections?id=${deckId}`;
  return (section: Section): (MenuItem & Pick<RowMenuItem, "id" | "icon">)[][] => {
    const action: Record<SectionActionId, MenuItem & Pick<RowMenuItem, "id" | "icon">> = {
      start_section: {
        id: "start_section",
        label: t`Start anyway`,
        icon: "unlock",
        onSelect: () => handlers.onStart(section),
      },
      review: {
        id: "review",
        label: t`Review this section`,
        icon: "play",
        onSelect: () => router.push(`/review?deck=${deckId}&section=${section.id}` as Href),
      },
      add_card: {
        id: "add_card",
        label: t`Add card here`,
        icon: "plus",
        onSelect: () => router.push(`/capture?deck=${deckId}&section=${section.id}` as Href),
      },
      select_cards: {
        id: "select_cards",
        label: t`Select cards`,
        icon: "check",
        onSelect: () => handlers.onSelectCards(section),
      },
      rename_section: {
        id: "rename_section",
        label: t`Rename section`,
        icon: "edit",
        onSelect: () => router.push(`${sectionsPage}&rename=${section.id}` as Href),
      },
      reorder_sections: {
        id: "reorder_sections",
        label: t`Reorder sections`,
        icon: "grip",
        onSelect: () => router.push(`${sectionsPage}&edit=1` as Href),
      },
      archive_section: {
        id: "archive_section",
        label: t`Archive section`,
        icon: "archive",
        destructive: true,
        onSelect: () => handlers.onArchive(section),
      },
    };
    return sectionActions(section, { owner, several })
      .map((group) => group.filter((id) => !(selecting && id === "select_cards")))
      .filter((group) => group.length > 0)
      .map((group) => group.map((id) => action[id]));
  };
}

/**
 * A section's heading in the deck's list: how much of it the learner knows, or a lock while it
 * waits, its name and count, You are here on the section they are on, and the section's menu. A tap
 * opens the section's page.
 */
export function SectionHeading({
  deckId,
  section,
  count,
  here,
  starting,
  rows,
}: {
  deckId: string;
  section: Section;
  count: number;
  here: boolean;
  starting: boolean;
  /** The section's menu, from `useSectionMenu`. */
  rows: (MenuItem & Pick<RowMenuItem, "id" | "icon">)[][];
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const router = useRouter();
  const locked = section.status !== "open";
  const sectionName = section.name;
  const href = sectionPage(deckId, section.id);
  const open = () => {
    captureEvent("section_page_opened", { from: "heading" });
    router.push(href);
  };
  const items: MenuItem[][] = rows;
  const headingLabel = locked
    ? plural(count, {
        one: `${sectionName}, not open yet, # card`,
        other: `${sectionName}, not open yet, # cards`,
      })
    : plural(count, { one: `${sectionName}, # card`, other: `${sectionName}, # cards` });
  const label = here ? `${headingLabel}, ${t`You are here`}` : headingLabel;
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
          accessibilityLabel={headingLabel}
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
          label={t`Options for ${{ sectionName: isolate(sectionName) }}`}
          symbol="ellipsis"
          look="row"
          disabled={starting}
        />
      )}
    </View>
  );
  if (rows.length === 0) {
    return (
      <Press scale={0.99} onPress={open} accessibilityRole="header" accessibilityLabel={label}>
        {heading}
      </Press>
    );
  }
  return (
    <RowMenu
      surface="section_heading"
      href={href}
      onPress={open}
      label={label}
      kind="heading"
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
        {t`${{ sectionName: isolate(sectionName) }} is ready. Start it to review its cards.`}
      </Text>
      <Button
        label={t`Start ${{ sectionName: isolate(sectionName) }}`}
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
