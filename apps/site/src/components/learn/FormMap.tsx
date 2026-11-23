import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { GitFork, Table2 } from "lucide-react";
import { useId, useReducer } from "react";
import {
  baseForm,
  type FormId,
  formById,
  formFor,
  formMapClip,
  formsOf,
  kindOf,
  lessonFor,
  type MapForm,
  type MapKind,
  type MapUse,
  meaningOf,
  type UseId,
  usesOf,
  WORDS,
  type WordId,
} from "../../lib/learn/form-map";
import { mapReducer, type MapStart, startMap } from "../../lib/learn/form-map-state";
import { formText } from "../../lib/learn/forms";
import { playSound, usePlaying } from "../../lib/learn/player";
import { Chips } from "./Explore";
import { FormTable } from "./FormTable";
import { Note, UseDetail } from "./FormUse";
import { useHoldInPlace } from "./hold";
import { LessonName } from "./LessonView";
import { Playing } from "./Sound";
import { Turning } from "./Turning";

interface Props {
  kind?: MapKind | undefined;
  start?: MapStart | undefined;
  known?: readonly UseId[] | undefined;
}

export function FormMap({ kind, start, known }: Props) {
  const { t, i18n } = useLingui();
  const [state, dispatch] = useReducer(
    mapReducer,
    start ?? { word: WORDS[kind ?? "verb"][0] as WordId },
    startMap,
  );
  const hold = useHoldInPlace();
  const id = useId();
  const { word, view } = state;
  const shown = kindOf(word);
  const openForm = state.status === "closed" ? null : state.form;
  const openUse = state.status === "use" ? state.use : null;
  const taught = (use: UseId) => !known || known.includes(use);
  const pressUse = (use: UseId, node: HTMLElement) => {
    hold(node);
    dispatch({ type: "use", use });
  };

  return (
    <div className="@container grid gap-5">
      <div className="grid gap-3">
        {kind ? null : (
          <KindSwitch kind={shown} onPick={(next) => dispatch({ type: "kind", kind: next })} />
        )}
        <Chips
          size="lg"
          label={t`Words`}
          items={WORDS[shown].map((each) => ({ label: each, value: each, lang: "et" }))}
          value={word}
          onPick={(next) => dispatch({ type: "word", word: next })}
        />
        <div className="-mb-2 flex items-center justify-between gap-3">
          <p aria-live="polite" className="text-md text-ink-secondary">
            <span lang="et" className="sr-only">
              {formsOf(shown)
                .map((form) => baseForm(word, form.id).form)
                .join(", ")}
              :{" "}
            </span>
            {i18n._(meaningOf(word))}
          </p>
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "view", view: view === "table" ? "branches" : "table" })
            }
            className="-me-3 inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 text-md font-medium text-(--form) transition-colors duration-150 hoverable:hover:bg-(--form-soft)"
          >
            {view === "table" ? (
              <GitFork aria-hidden="true" className="size-4.5 rotate-180" />
            ) : (
              <Table2 aria-hidden="true" className="size-4.5" />
            )}
            {view === "table" ? t`Branches` : t`Table`}
          </button>
        </div>
      </div>
      {view === "table" ? (
        <FormTable word={word} open={openUse} onPress={pressUse} taught={taught} />
      ) : (
        <div className="grid">
          <ul className="m-0 grid list-none grid-cols-3 grid-rows-[repeat(3,auto)] gap-x-2 p-0 @xl:gap-x-3">
            {formsOf(shown).map((form) => (
              <FormKey
                key={form.id}
                form={form}
                word={word}
                open={openForm === form.id}
                controls={`${id}-${form.id}`}
                onPress={() => dispatch({ type: "form", form: form.id })}
              />
            ))}
          </ul>
          {openForm ? (
            <Branch
              key={openForm}
              id={`${id}-${openForm}`}
              form={openForm}
              word={word}
              open={openUse}
              onPress={pressUse}
              taught={taught}
            />
          ) : (
            <p className="pt-4 text-md text-ink-secondary">
              <Trans>Tap a form to see what is built from it.</Trans>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function KindSwitch({ kind, onPick }: { kind: MapKind; onPick: (kind: MapKind) => void }) {
  const { t } = useLingui();
  const names: Record<MapKind, string> = { verb: t`Verbs`, noun: t`Nouns` };
  return (
    <fieldset className="m-0 flex w-fit min-w-0 rounded-full border-0 bg-(--form-soft) p-1">
      <legend className="sr-only">{t`Verbs or nouns`}</legend>
      {(["verb", "noun"] as const).map((each) => (
        <button
          key={each}
          type="button"
          aria-pressed={kind === each}
          onClick={() => onPick(each)}
          className={clsx(
            "relative min-h-9 cursor-pointer rounded-full px-4 text-md font-medium transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-1",
            kind === each
              ? "bg-plate text-ink edge"
              : "text-ink-secondary hoverable:hover:text-ink",
          )}
        >
          {names[each]}
        </button>
      ))}
    </fieldset>
  );
}

function FormKey(props: {
  form: MapForm;
  word: WordId;
  open: boolean;
  controls: string;
  onPress: () => void;
}) {
  const { form, word, open, controls, onPress } = props;
  const { i18n } = useLingui();
  const { form: text } = baseForm(word, form.id);
  const src = formMapClip(text);
  const playing = usePlaying(src ?? "");
  return (
    <li className="row-span-3 grid min-w-0 grid-rows-subgrid">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? controls : undefined}
        data-open={open ? "" : undefined}
        data-playing={src && playing ? "" : undefined}
        onClick={() => {
          onPress();
          if (!open && src) void playSound(src);
        }}
        className="learn-key relative row-span-3 grid min-w-0 cursor-pointer grid-rows-subgrid content-start gap-y-0.5 rounded-lg bg-plate px-2 py-2.5 text-start @xl:px-4 @xl:py-3 hoverable:hover:bg-plate-hover"
      >
        <span className="text-xs leading-tight font-medium text-(--form) @xl:text-md">
          <LessonName name={i18n._(form.name)} />
          <span className="sr-only">, </span>
        </span>
        <Turning
          form={text}
          className="overflow-hidden text-xl leading-snug font-semibold tracking-tight @xl:text-3xl"
        />
        <small
          aria-hidden="true"
          lang="et"
          className="relative text-xs leading-tight text-ink-muted"
        >
          <span className={playing ? "invisible" : undefined}>{form.et}</span>
          {playing && <Playing className="absolute start-0 top-0.5 h-3 text-(--form)" />}
        </small>
      </button>
    </li>
  );
}

function Branch(props: {
  id: string;
  form: FormId;
  word: WordId;
  open: UseId | null;
  onPress: (use: UseId, node: HTMLElement) => void;
  taught: (use: UseId) => boolean;
}) {
  const { id, form, word, open, onPress, taught } = props;
  const { asks, et } = formById(form);
  const name = et.charAt(0).toUpperCase() + et.slice(1);
  const { odd } = baseForm(word, form);
  const uses = usesOf(form);
  const at = formsOf(kindOf(word)).findIndex((each) => each.id === form);
  return (
    <div id={id} className="grid">
      <div
        aria-hidden="true"
        className="learn-stem"
        style={{ "--at": `${((at + 0.5) / 3) * 100}%` } as React.CSSProperties}
      />
      <div className="learn-swap">
        <p className="learn-trunk ps-8 pb-2 text-md text-ink-secondary">
          <Trans>
            <span lang="et" className="font-medium text-ink">
              {name}
            </span>{" "}
            answers{" "}
            <span lang="et" className="font-medium whitespace-nowrap text-ink">
              {asks}
            </span>
          </Trans>
          {odd && (
            <span className="block">
              <span lang="et" className="font-medium text-ink">
                {baseForm(word, form).form}
              </span>{" "}
              <Note text={odd} />
            </span>
          )}
        </p>
      </div>
      <ol
        className="m-0 grid list-none p-0 @xl:grid-cols-[17.5rem_minmax(0,1fr)] @xl:gap-x-5"
        style={{ gridTemplateRows: `repeat(${uses.length}, max-content) 1fr` }}
      >
        {uses.map((use, i) => (
          <UseRow
            key={use.id}
            use={use}
            word={word}
            open={open === use.id}
            last={i === uses.length - 1}
            taught={taught(use.id)}
            onPress={(node) => onPress(use.id, node)}
          />
        ))}
        {!open && (
          <li
            aria-hidden="true"
            className="col-start-2 row-[1/-1] hidden min-h-60 place-items-center rounded-lg border border-dashed border-(--form-faint) p-6 text-center text-md text-ink-secondary @xl:grid"
          >
            <Trans>Tap a line to see it in sentences.</Trans>
          </li>
        )}
      </ol>
    </div>
  );
}

function UseRow(props: {
  use: MapUse;
  word: WordId;
  open: boolean;
  last: boolean;
  taught: boolean;
  onPress: (node: HTMLElement) => void;
}) {
  const { use, word, open, last, taught, onPress } = props;
  const { i18n } = useLingui();
  const id = useId();
  const cell = formFor(word, use.id);
  const base = baseForm(word, use.form).form;
  const built = cell && formText(cell.form) !== base ? cell.form : null;
  const number = lessonFor(use.id).n;
  return (
    <li className="contents">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        data-open={open ? "" : undefined}
        data-taught={taught ? "" : undefined}
        data-last={last ? "" : undefined}
        onClick={(event) => onPress(event.currentTarget)}
        className="learn-stop @xl:col-start-1"
      >
        <i aria-hidden="true" className="learn-dot" />
        <span className="grid min-w-0">
          <span className="text-md leading-snug font-medium">
            <LessonName name={i18n._(use.label)} />
          </span>
          {cell?.odd && (
            <small className="text-sm leading-snug text-ink-secondary">
              <span className="sr-only">: </span>
              <Note text={cell.odd} />
            </small>
          )}
          {!cell && (
            <small className="text-sm leading-snug text-ink-secondary">
              <Trans>
                Not with <span lang="et">{word}</span>
              </Trans>
            </small>
          )}
          {!taught && (
            <small className="text-sm leading-snug text-ink-secondary">
              <Trans>Lesson {number}</Trans>
            </small>
          )}
        </span>
        {built && (
          <Turning
            before=", "
            form={built}
            className="text-lg leading-snug font-semibold tracking-tight"
          />
        )}
      </button>
      {open && (
        <div
          id={id}
          data-last={last ? "" : undefined}
          className="learn-off-line min-w-0 pt-1 pb-4 @xl:col-start-2 @xl:row-[1/-1] @xl:min-h-60 @xl:p-0"
        >
          <UseDetail use={use.id} taught={taught} />
        </div>
      )}
    </li>
  );
}
