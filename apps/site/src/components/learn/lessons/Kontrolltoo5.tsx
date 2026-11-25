import { Trans, useLingui } from "@lingui/react/macro";
import { Checkpoint } from "../Checkpoint";
import { LessonView, Prose } from "../LessonView";

const SLUG = "kontrolltoo-5";

export function Kontrolltoo5Lesson() {
  const { t } = useLingui();
  return (
    <LessonView
      slug={SLUG}
      glossary={{}}
      sub={
        <Trans>
          Check what Stage 5 taught: consonant gradation, total and partial object, plural partitive
          and plural cases, perfect and pluperfect, conditional, let’s, impersonal and verb cases —
          mixed, with no hints beforehand.
        </Trans>
      }
      facts={[
        <Trans key="t">Checkpoint</Trans>,
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">20 mixed questions</Trans>,
      ]}
      words={[]}
      recap={[]}
      sections={[
        {
          id: "test",
          title: t`Stage 5 checkpoint`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Twenty mixed questions from Stage 5. At the end you see your score for each rule
                    with a link back to the lesson that teaches it.
                  </Trans>
                </p>
              </Prose>
              <Checkpoint stageIndex={4} count={20} />
            </>
          ),
        },
      ]}
    />
  );
}
