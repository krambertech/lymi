import { Trans, useLingui } from "@lingui/react/macro";
import { Checkpoint } from "../Checkpoint";
import { LessonView, Prose } from "../LessonView";

const SLUG = "kontrolltoo-4";

export function Kontrolltoo4Lesson() {
  const { t } = useLingui();
  return (
    <LessonView
      slug={SLUG}
      glossary={{}}
      sub={
        <Trans>
          Check what Stage 4 taught: with and without, pronouns in every case, ordinals and dates,
          time expressions, word order, adjectives, comparing, translative and -gi / -ki — mixed,
          with no hints beforehand.
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
          title: t`Stage 4 checkpoint`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Twenty mixed questions from Stage 4. At the end you see your score for each rule
                    with a link back to the lesson that teaches it.
                  </Trans>
                </p>
              </Prose>
              <Checkpoint stageIndex={3} count={20} />
            </>
          ),
        },
      ]}
    />
  );
}
