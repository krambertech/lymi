import type { MessageDescriptor } from "@lingui/core";
import { Trans, useLingui } from "@lingui/react/macro";
import { lessonPath } from "../../lib/learn/catalogue";
import {
  formMapClip,
  lessonFor,
  litParts,
  plainText,
  type UseId,
  useById,
} from "../../lib/learn/form-map";
import { ListenRows } from "./Explore";
import { LessonName } from "./LessonView";

export function Note({ text }: { text: MessageDescriptor }) {
  const { i18n } = useLingui();
  return litParts(i18n._(text)).map((part, i) =>
    part.lit ? (
      // oxlint-disable-next-line react/no-array-index-key -- a note's parts never reorder
      <span key={i} lang="et" className="font-medium whitespace-nowrap text-ink">
        {part.text}
      </span>
    ) : (
      part.text
    ),
  );
}

function LitSentence({ text }: { text: string }) {
  return litParts(text).map((part, i) =>
    part.lit ? (
      // oxlint-disable-next-line react/no-array-index-key -- a sentence's parts never reorder
      <b key={i} className="font-semibold text-(--form)">
        {part.text}
      </b>
    ) : (
      part.text
    ),
  );
}

function ComingLesson({ use }: { use: UseId }) {
  const { i18n } = useLingui();
  const lesson = lessonFor(use);
  const number = lesson.n;
  const name = <LessonName name={i18n._(lesson.name)} />;
  return (
    <p className="text-sm text-ink-secondary">
      {lesson.slug ? (
        <Trans>
          Lesson {number} teaches this:{" "}
          <a
            href={lessonPath(lesson.slug, i18n.locale)}
            className="relative font-medium text-(--form) underline underline-offset-3 before:absolute before:inset-x-0 before:-inset-y-3.5"
          >
            {name}
          </a>
        </Trans>
      ) : (
        <Trans>
          Lesson {number} will teach this: {name}
        </Trans>
      )}
    </p>
  );
}

export function UseDetail({ use, taught }: { use: UseId; taught: boolean }) {
  const { i18n } = useLingui();
  const { tip, examples } = useById(use);
  return (
    <div className="learn-swap">
      <div className="grid gap-2.5">
        {tip && (
          <p className="text-md text-ink-secondary">
            <Note text={tip} />
          </p>
        )}
        <ListenRows
          items={examples.map((example) => ({
            main: <LitSentence text={example.et} />,
            sub: i18n._(example.meaning),
            src: formMapClip(plainText(example.et)),
          }))}
        />
        {!taught && <ComingLesson use={use} />}
      </div>
    </div>
  );
}
