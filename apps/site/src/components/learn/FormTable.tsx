import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Fragment, useId } from "react";
import {
  baseForm,
  formFor,
  formsOf,
  kindOf,
  lessonFor,
  type MapUse,
  type UseId,
  usesOf,
  type WordId,
} from "../../lib/learn/form-map";
import { formText } from "../../lib/learn/forms";
import { Note, UseDetail } from "./FormUse";
import { LessonName } from "./LessonView";
import { Turning } from "./Turning";

interface Props {
  word: WordId;
  open: UseId | null;
  onPress: (use: UseId, node: HTMLElement) => void;
  taught: (use: UseId) => boolean;
}

export function FormTable({ word, open, onPress, taught }: Props) {
  const { t, i18n } = useLingui();
  const forms = formsOf(kindOf(word));
  return (
    <div className="@container">
      <table
        // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- a table laid out as a grid loses its semantics in Safari
        role="table"
        aria-label={t`Forms of ${word}`}
        className="learn-map grid"
      >
        <thead
          // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- a table laid out as a grid loses its semantics in Safari
          role="rowgroup"
          className="contents"
        >
          <tr
            // oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- a table laid out as a grid loses its semantics in Safari
            role="row"
            className="sr-only col-span-full grid-cols-subgrid @xl:not-sr-only @xl:grid"
          >
            <th
              // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- a table laid out as a grid loses its semantics in Safari
              role="columnheader"
              scope="col"
            >
              <span className="sr-only">
                <Trans>Use</Trans>
              </span>
            </th>
            {forms.map((form) => (
              <th
                key={form.id}
                // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- a table laid out as a grid loses its semantics in Safari
                role="columnheader"
                scope="col"
                className="relative grid min-w-0 justify-items-center pb-3 text-center font-normal"
              >
                <span className="text-sm font-medium text-(--form)">
                  <LessonName name={i18n._(form.name)} />
                </span>
                <Turning
                  form={baseForm(word, form.id).form}
                  className="text-2xl leading-snug font-semibold tracking-tight"
                />
                <small lang="et" className="text-xs text-ink-muted">
                  {form.et}
                </small>
              </th>
            ))}
          </tr>
        </thead>
        {forms.map((form, column) => (
          <tbody
            key={form.id}
            // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- a table laid out as a grid loses its semantics in Safari
            role="rowgroup"
            className="contents"
          >
            <tr
              // oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- a table laid out as a grid loses its semantics in Safari
              role="row"
              className={clsx("col-span-full grid @xl:hidden", column > 0 && "pt-6")}
            >
              <th
                // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- a table laid out as a grid loses its semantics in Safari
                role="rowheader"
                scope="rowgroup"
                colSpan={2}
                className="flex flex-wrap items-baseline justify-between gap-x-3 border-b-2 border-(--form-faint) pb-1.5 text-start font-normal"
              >
                <span className="grid">
                  <span className="text-md font-medium text-(--form)">
                    <LessonName name={i18n._(form.name)} />
                  </span>
                  <small lang="et" className="text-xs text-ink-muted">
                    {form.et}
                  </small>
                </span>
                <Turning
                  form={baseForm(word, form.id).form}
                  className="text-2xl font-semibold tracking-tight"
                />
              </th>
            </tr>
            {usesOf(form.id).map((use, i, uses) => (
              <UseCells
                key={use.id}
                use={use}
                word={word}
                column={column}
                columns={forms.length}
                last={i === uses.length - 1}
                open={open === use.id}
                taught={taught(use.id)}
                onPress={(node) => onPress(use.id, node)}
              />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function UseCells(props: {
  use: MapUse;
  word: WordId;
  column: number;
  columns: number;
  last: boolean;
  open: boolean;
  taught: boolean;
  onPress: (node: HTMLElement) => void;
}) {
  const { use, word, column, columns, last, open, taught, onPress } = props;
  const { i18n } = useLingui();
  const id = useId();
  const cell = formFor(word, use.id);
  const number = lessonFor(use.id).n;
  const label = i18n._(use.label);
  const built = cell && formText(cell.form) !== baseForm(word, use.form).form;
  return (
    <Fragment>
      <tr
        // oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- a table laid out as a grid loses its semantics in Safari
        role="row"
        className="col-span-full grid grid-cols-subgrid items-center"
      >
        <th
          // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- a table laid out as a grid loses its semantics in Safari
          role="rowheader"
          scope="row"
          className={clsx(
            "grid min-w-0 py-1.5 pe-3 text-start text-md leading-snug font-normal",
            taught ? "text-ink" : "text-ink-secondary",
          )}
        >
          <span className="block">
            <LessonName name={label} />
          </span>
          {cell?.odd && (
            <small className="text-sm leading-snug text-ink-secondary">
              <Note text={cell.odd} />
            </small>
          )}
          {!taught && (
            <small className="text-sm leading-snug text-ink-secondary">
              <Trans>Lesson {number}</Trans>
            </small>
          )}
        </th>
        {Array.from({ length: columns }, (_, at) => (
          <td
            // oxlint-disable-next-line react/no-array-index-key -- columns never reorder
            key={at}
            // oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- a table laid out as a grid loses its semantics in Safari
            role="cell"
            data-lane={
              at > column ? "through" : at === column ? (last ? "end" : "stop") : undefined
            }
            className={clsx(
              "learn-lane min-w-0 items-center self-stretch py-[3px]",
              at === column ? "grid justify-items-end @xl:justify-items-center" : "hidden @xl:grid",
            )}
          >
            {at !== column ? null : cell ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={open ? id : undefined}
                data-open={open ? "" : undefined}
                data-taught={taught ? "" : undefined}
                onClick={(event) => onPress(event.currentTarget)}
                className={clsx(
                  "relative inline-grid min-h-11 max-w-full cursor-pointer place-items-center rounded-full px-4 text-lg font-semibold tracking-tight",
                  !taught
                    ? "learn-later"
                    : built
                      ? "learn-key bg-plate hoverable:hover:bg-plate-hover"
                      : "learn-plain",
                )}
              >
                <Turning form={cell.form} />
                <span className="sr-only">, {label}</span>
              </button>
            ) : (
              <span className="relative bg-(--tray) px-2 text-sm text-ink-secondary">
                <Trans>
                  Not with <span lang="et">{word}</span>
                </Trans>
              </span>
            )}
          </td>
        ))}
      </tr>
      {open && (
        <tr
          // oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- a table laid out as a grid loses its semantics in Safari
          role="row"
          className="col-span-full grid"
        >
          <td
            id={id}
            // oxlint-disable-next-line jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role -- a table laid out as a grid loses its semantics in Safari
            role="cell"
            colSpan={columns + 1}
            className="min-w-0 pt-1 pb-4"
          >
            <UseDetail use={use.id} taught={taught} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
