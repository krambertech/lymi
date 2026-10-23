import type { Section } from "./api";

export type SectionActionId =
  | "start_section"
  | "review"
  | "add_card"
  | "select_cards"
  | "rename_section"
  | "reorder_sections"
  | "archive_section";

/**
 * What can be done to a section, in groups and in order, with the removal last on its own. Every
 * place that offers a section's actions draws this list, so a heading's ⋯, its long press and a
 * section page never disagree. A null section is the deck's cards with no section, which can only
 * be selected.
 */
export function sectionActions(
  section: Pick<Section, "status" | "due" | "total"> | null,
  { owner, several }: { owner: boolean; several: boolean },
): SectionActionId[][] {
  if (!section) return [["select_cards"]];
  const learn: SectionActionId[] = [];
  if (section.status === "locked") learn.push("start_section");
  // A card started early in a section that is not open is still in review, so it counts here too.
  if (section.due > 0) learn.push("review");
  const select: SectionActionId[] = section.total > 0 ? ["select_cards"] : [];
  const tend: SectionActionId[] = owner
    ? ["add_card", ...select, "rename_section", ...(several ? ["reorder_sections" as const] : [])]
    : select;
  const remove: SectionActionId[] = owner ? ["archive_section"] : [];
  return [learn, tend, remove].filter((group) => group.length > 0);
}
