import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type ReactNode, useState } from "react";
import { formText, splitForm } from "../../lib/learn/forms";
import { playSound, usePlaying } from "../../lib/learn/player";
import { Playing } from "./Sound";

/** One form in the table: written with `|` before the part to light, such as "maja|s". */
export interface ParadigmCell {
  form: string;
  src: string;
  /** What the line under the table says once this form is pressed, in place of its row's tip. */
  note?: ReactNode;
}

export interface ParadigmRow {
  id: string;
  /** The row's name in the reader's language, such as Inessive or I; it names its forms too. */
  label: string;
  /** The row's Estonian name, shown small under the label, such as seesütlev. */
  et?: string | undefined;
  /** The question word the row answers, such as milles?, for the first column. */
  ask?: string | undefined;
  /** What the line under the table says for any form of this row without a note of its own. */
  tip?: ReactNode;
  /** One form per column; null leaves a cell empty. */
  cells: readonly (ParadigmCell | null)[];
}

interface ParadigmProps {
  /** What the table holds, for a screen reader: “Forms of maja”. */
  label: string;
  /** One heading per column of forms, such as One and More than one; a single column may have none. */
  columns?: readonly string[];
  rows: readonly ParadigmRow[];
  /** One row or one column to tint, by row id or column index. */
  highlight?: { row: string } | { column: number };
  /** The line under the table before any form is pressed. */
  empty?: { title: ReactNode; tip: ReactNode };
}

/**
 * A table of forms on the stage's tray: a noun's cases, a verb's persons or tenses. A tap on a form
 * plays it and explains it under the table; each form's ending is lit. With more than one column
 * the rows stack into a list on a narrow screen, so no form runs past the edge.
 */
export function Paradigm({ label, columns = [], rows, highlight, empty }: ParadigmProps) {
  const { t } = useLingui();
  const [picked, setPicked] = useState<{ row: number; column: number } | null>(null);
  const width = Math.max(columns.length, ...rows.map((row) => row.cells.length));
  const asks = rows.some((row) => row.ask);
  const stacks = width > 1;
  const row = picked ? rows[picked.row] : undefined;
  const cell = picked ? row?.cells[picked.column] : undefined;
  const lit = (r: ParadigmRow, column: number) =>
    highlight ? ("row" in highlight ? highlight.row === r.id : highlight.column === column) : false;
  const detail =
    row && cell && picked
      ? {
          form: cell.form,
          title: [row.label, columns[picked.column]].filter(Boolean).join(" · "),
          tip: cell.note ?? row.tip,
        }
      : empty
        ? { form: null, ...empty }
        : null;
  const template = [asks && "max-content", "max-content", `repeat(${width}, minmax(0, 1fr))`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="@container grid gap-4">
      {/* The table is laid out as a grid, so each part names its role: Safari drops a grid's table semantics. */}
      <table
        // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
        role="table"
        aria-label={label}
        className={clsx(
          "grid gap-x-3 gap-y-1.5",
          stacks ? "@lg:grid-cols-(--paradigm)" : "grid-cols-(--paradigm)",
        )}
        style={{ "--paradigm": template } as React.CSSProperties}
      >
        {columns.length > 0 && (
          <thead
            // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
            role="rowgroup"
            className="contents"
          >
            <tr
              // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
              role="row"
              className={clsx(
                "col-span-full grid-cols-subgrid pb-0.5",
                stacks ? "sr-only @lg:not-sr-only @lg:grid" : "grid",
              )}
            >
              {asks && (
                <th
                  // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
                  role="columnheader"
                  scope="col"
                >
                  <span className="sr-only">{t`Question`}</span>
                </th>
              )}
              <th
                // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
                role="columnheader"
                scope="col"
              >
                <span className="sr-only">{t`Form`}</span>
              </th>
              {Array.from({ length: width }, (_, column) => (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: columns never reorder
                  key={column}
                  // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
                  role="columnheader"
                  scope="col"
                  className={clsx(
                    "ps-1 text-start text-sm font-normal",
                    highlight && "column" in highlight && highlight.column === column
                      ? "font-semibold text-(--form)"
                      : "text-ink-secondary",
                  )}
                >
                  {columns[column]}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody
          // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
          role="rowgroup"
          className="contents"
        >
          {rows.map((each, r) => (
            // On a narrow screen a row stacks: its question and name share the first line, over its forms,
            // which go one per line below 28rem so a long form is never cut short.
            <tr
              key={each.id}
              // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
              role="row"
              className={clsx(
                "col-span-full grid items-center gap-x-3",
                stacks
                  ? "grid-cols-1 gap-y-1.5 not-first:pt-2 @md:grid-cols-(--stacked) @lg:grid-cols-subgrid @lg:gap-y-0 @lg:pt-0!"
                  : "grid-cols-subgrid",
              )}
              style={{ "--stacked": `repeat(${width}, minmax(0, 1fr))` } as React.CSSProperties}
            >
              {asks && (
                <td
                  // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
                  role="cell"
                  lang="et"
                  className={clsx(
                    "text-lg font-medium text-(--form) tabular-nums @lg:text-end",
                    stacks &&
                      "col-span-full row-start-1 self-start @lg:col-auto @lg:row-start-auto",
                  )}
                >
                  {each.ask}
                </td>
              )}
              <th
                // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
                role="rowheader"
                scope="row"
                className={clsx(
                  "grid min-w-0 text-start leading-tight font-normal",
                  // Stacked, the name sits beside the question, past the widest question word.
                  stacks && "col-span-full row-start-1 @lg:col-auto @lg:row-start-auto",
                  stacks && asks && "ps-26 @lg:ps-0",
                )}
              >
                <span
                  className={clsx(
                    "text-md",
                    highlight && "row" in highlight && highlight.row === each.id
                      ? "font-semibold text-(--form)"
                      : "font-medium",
                  )}
                >
                  {each.label}
                </span>
                {each.et && (
                  <small lang="et" className="text-xs text-ink-muted">
                    {each.et}
                  </small>
                )}
              </th>
              {Array.from({ length: width }, (_, column) => {
                const form = each.cells[column];
                return (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: columns never reorder
                    key={column}
                    // biome-ignore lint/a11y/noRedundantRoles: a table laid out as a grid loses its semantics in Safari
                    role="cell"
                    className="min-w-0"
                  >
                    {form ? (
                      <FormKey
                        cell={form}
                        where={[each.label, columns[column]].filter(Boolean).join(", ")}
                        column={stacks ? columns[column] : undefined}
                        tinted={lit(each, column)}
                        pressed={picked?.row === r && picked.column === column}
                        onPress={() => setPicked({ row: r, column })}
                      />
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* The live region stays put; only what is inside it is swapped. */}
      <div aria-live="polite">
        {detail && (
          <div
            key={picked ? `${picked.row}-${picked.column}` : "empty"}
            className="learn-swap flex min-h-16 items-center gap-4"
          >
            <span
              lang="et"
              aria-hidden={!detail.form}
              className="grid h-16 min-w-16 shrink-0 place-items-center rounded-tile bg-plate px-3 pb-1 text-3xl font-semibold whitespace-nowrap max-sm:text-2xl"
            >
              {detail.form ? (
                <span>
                  <Lit form={detail.form} />
                </span>
              ) : (
                <span className="text-(--form)">?</span>
              )}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-xl font-medium">{detail.title}</span>
              {detail.tip && <span className="text-md text-ink-secondary">{detail.tip}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** A form with the part after its `|` in the stage's ink. */
export function Lit({ form }: { form: string }) {
  const { stem, ending } = splitForm(form);
  return (
    <>
      {stem}
      {ending && <span className="text-(--form)">{ending}</span>}
    </>
  );
}

function FormKey(props: {
  cell: ParadigmCell;
  /** The form's row and column, read after it by a screen reader: “Inessive, One”. */
  where: string;
  /** The column's heading, shown inside the key when the rows are stacked. */
  column: string | undefined;
  tinted: boolean;
  pressed: boolean;
  onPress: () => void;
}) {
  const { cell, where, column, tinted, pressed, onPress } = props;
  const playing = usePlaying(cell.src);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-playing={playing ? "" : undefined}
      onClick={() => {
        onPress();
        void playSound(cell.src);
      }}
      className={clsx(
        "learn-key relative grid w-full min-w-0 cursor-pointer justify-items-start rounded-tile px-3 py-2 text-start",
        tinted ? "bg-(--form-soft)" : "bg-plate hoverable:hover:bg-plate-hover",
      )}
    >
      {column && (
        <small aria-hidden="true" className="text-xs text-ink-muted @lg:hidden">
          {column}
        </small>
      )}
      <b
        lang="et"
        className="max-w-full truncate text-xl font-semibold tracking-tight max-sm:text-lg"
        title={formText(cell.form)}
      >
        <Lit form={cell.form} />
      </b>
      <span className="sr-only">, {where}</span>
      {playing && <Playing className="absolute end-2.5 top-2.5 h-3 text-(--form)" />}
    </button>
  );
}
