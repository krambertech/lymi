import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, PencilLine, Plus } from "lucide-react";
import type { Section } from "../lib/api";
import { Button, IconButton } from "./button";

export interface SectionManagerProps {
  sections: Section[];
  onCreate: () => void;
  onRename: (section: Section) => void;
  onMove: (section: Section, by: -1 | 1) => void;
  onArchive: (section: Section) => void;
  onShowArchived: () => void;
}

/**
 * A deck's sections in order, arranged with arrows rather than dragging: the order is what every
 * learner opens them in, so it is changed here, deliberately, and not by a stray drag in the list.
 */
export function SectionManager({
  sections,
  onCreate,
  onRename,
  onMove,
  onArchive,
  onShowArchived,
}: SectionManagerProps) {
  const { t } = useLingui();
  return (
    <div className="grid gap-3">
      {sections.length > 0 && (
        <ol className="edge divide-y divide-edge overflow-hidden rounded-lg bg-plate">
          {sections.map((section, index) => {
            const sectionName = section.name;
            return (
              <li key={section.id} className="flex min-h-14 items-center gap-3 ps-4 pe-1.5">
                <span className="w-5 shrink-0 text-sm text-muted tabular-nums">{index + 1}</span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-base font-medium text-text">{sectionName}</span>
                  <span className="text-sm text-muted">
                    <Plural value={section.total} one="# card" other="# cards" />
                  </span>
                </span>
                <span className="flex shrink-0 items-center">
                  <IconButton
                    size="sm"
                    label={t`Rename ${sectionName}`}
                    onClick={() => onRename(section)}
                  >
                    <PencilLine />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label={t`Move ${sectionName} up`}
                    aria-disabled={index === 0}
                    className="aria-disabled:opacity-40"
                    onClick={() => index > 0 && onMove(section, -1)}
                  >
                    <ArrowUp />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label={t`Move ${sectionName} down`}
                    aria-disabled={index === sections.length - 1}
                    className="aria-disabled:opacity-40"
                    onClick={() => index < sections.length - 1 && onMove(section, 1)}
                  >
                    <ArrowDown />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label={t`Archive ${sectionName}`}
                    onClick={() => onArchive(section)}
                  >
                    <Archive />
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onCreate}>
          <Plus aria-hidden="true" />
          <Trans>New section</Trans>
        </Button>
        <Button size="sm" variant="ghost" onClick={onShowArchived}>
          <ArchiveRestore aria-hidden="true" />
          <Trans>Archived sections</Trans>
        </Button>
      </div>
    </div>
  );
}
