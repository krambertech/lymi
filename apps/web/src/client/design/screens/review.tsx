import { useState } from "react";
import { GradeBar, ReviewCard, ReviewHeader } from "../../views/review-view";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot } from "../shot";

function ReviewPhone({
  revealed: init,
  produce,
  picture,
}: {
  revealed: boolean;
  produce?: boolean | undefined;
  picture?: boolean | undefined;
}) {
  const [revealed, setRevealed] = useState(init);
  const item = picture ? m.queueItemPicture : produce ? m.queueItemProduce : m.queueItem;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
      <ReviewHeader attempts={4} goal={20} />
      <ReviewCard
        item={item}
        deck={m.reviewDeck}
        section={picture ? undefined : "Lezione 3"}
        revealed={revealed}
        hint={!revealed}
        onReveal={() => setRevealed(true)}
        onPlayAudio={noop}
        className="mt-4"
      />
      <GradeBar
        id={!produce && !picture ? "review-grade-preview" : undefined}
        revealed={revealed}
        animateIn
        next={item.next}
        onGrade={() => setRevealed(false)}
      />
    </div>
  );
}

export const screen: Screen = {
  order: 30,
  slug: "review",
  name: "Review",
  source: "views/review-view.tsx",
  note: "The card itself reveals the answer. Four equally weighted choices use icons and labels without exposing the scheduling algorithm; grading moves to the next card.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
        <PhoneShot caption="Question" initial="dark" path="/review" bare>
          <ReviewPhone revealed={false} />
        </PhoneShot>
        <PhoneShot caption="Revealed" initial="light" path="/review" bare>
          <ReviewPhone revealed />
        </PhoneShot>
        <PhoneShot caption="Production direction, revealed" initial="dark" path="/review" bare>
          <ReviewPhone revealed produce />
        </PhoneShot>
        <PhoneShot caption="Picture → meaning" initial="light" path="/review" bare>
          <ReviewPhone revealed={false} picture />
        </PhoneShot>
        <PhoneShot caption="Picture → meaning, revealed" initial="dark" path="/review" bare>
          <ReviewPhone revealed picture />
        </PhoneShot>
      </div>
    </div>
  ),
};
