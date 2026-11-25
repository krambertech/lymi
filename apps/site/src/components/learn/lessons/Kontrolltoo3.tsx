import { Trans, useLingui } from "@lingui/react/macro";
import { Checkpoint } from "../Checkpoint";
import { LessonView, Prose } from "../LessonView";

const SLUG = "kontrolltoo-3";

export function Kontrolltoo3Lesson() {
  const { t } = useLingui();
  return (
    <LessonView
      slug={SLUG}
      glossary={{}}
      sub={
        <Trans>
          Check what Stage 3 taught: the three forms of a verb, infinitives, modals, going and
          coming back, liking, past tense, negation in the past and the future — mixed, with no
          hints beforehand.
        </Trans>
      }
      facts={[
        <Trans key="t">Final challenge</Trans>,
        <Trans key="m">15 minutes</Trans>,
        <Trans key="q">20 mixed questions</Trans>,
      ]}
      words={[]}
      recap={[]}
      sections={[
        {
          id: "test",
          title: t`Mixed questions`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Twenty mixed questions from Stage 3. At the end you see your score for each rule
                    with a link back to the lesson that teaches it.
                  </Trans>
                </p>
              </Prose>
              <Checkpoint stageIndex={2} count={20} />
            </>
          ),
        },
      ]}
    />
  );
}
