import { Trans, useLingui } from "@lingui/react/macro";
import { Checkpoint } from "../Checkpoint";
import { LessonView, Prose } from "../LessonView";

const SLUG = "kontrolltoo-2";

export function Kontrolltoo2Lesson() {
  const { t } = useLingui();
  return (
    <LessonView
      slug={SLUG}
      glossary={{}}
      sub={
        <Trans>
          Check what Stage 2 taught: how nouns change, the genitive, saying “I have”, the partitive,
          the plural, in and into, on and onto, and place words — mixed, with no hints beforehand.
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
                    Twenty mixed questions from Stage 2. At the end you see your score for each rule
                    with a link back to the lesson that teaches it.
                  </Trans>
                </p>
              </Prose>
              <Checkpoint stageIndex={1} count={20} />
            </>
          ),
        },
      ]}
    />
  );
}
