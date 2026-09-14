import type { NewCardRuleId, ReviewOrderId, SchedulingGuide } from "@lymi/core/simulation";
import { clsx } from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Table, Td, Th } from "../../Table";
import { Defs, H2, H3, Lead, NextLinks, Note } from "../Prose";
import { AttemptStrip, StripLegend } from "../scheduling/AttemptStrip";
import { Figure } from "../scheduling/Figure";
import { ForgettingCurves } from "../scheduling/ForgettingCurves";
import {
  count,
  days,
  duration,
  GRADE_NAMES,
  moreThan,
  ordinal,
  ordinalShort,
  percent,
} from "../scheduling/format";
import { OddsBars } from "../scheduling/OddsBars";
import { Precedence } from "../scheduling/Precedence";
import { ReturnGaps, SlotPattern } from "../scheduling/Returns";

const REPO = "https://github.com/krambertech/lymi/blob/main";

const REVIEW_ORDER_NAMES: Record<ReviewOrderId, string> = {
  due: "Oldest due date first",
  lowest: "Lowest recall first",
  highest: "Highest recall first",
  random: "Random",
  forgetting: "Weighted by 1 − recall",
  lymi: "Lymi: weighted by recall⁴",
};

const NEW_CARD_NAMES: Record<NewCardRuleId, string> = {
  halving: "Odds halve weekly",
  floor: "Odds halve weekly, floor of 1/8",
  equal: "All equally likely",
  oldest: "Oldest first",
  lymi: "Lymi: 3 in 4 recent, 1 in 4 oldest",
};

function Checklist({ items }: { items: ReactNode[] }) {
  return (
    <ul className="my-5 grid list-none gap-3 !ps-0">
      {items.map((item, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: a static list
          key={i}
          className="!m-0 grid grid-cols-[1.25rem_1fr] gap-3"
        >
          <span
            aria-hidden="true"
            className="mt-[3px] grid size-5 place-items-center rounded-full bg-plate-2 text-text-2"
          >
            <Check className="size-3" strokeWidth={2.5} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A generated row that is Lymi's own choice reads a step stronger than the rules it beat. */
function rowClass(ours: boolean) {
  return clsx(ours && "bg-plate-2 font-medium text-text");
}

function Source({
  href,
  title,
  cite,
  supports,
  against,
}: {
  href: string;
  title: string;
  cite: string;
  supports: ReactNode;
  against: ReactNode;
}) {
  return (
    <li className="!m-0 border-t border-edge py-5 last:border-b">
      <p className="!mb-0.5 font-medium text-text">
        <a href={href}>{title}</a>
      </p>
      <p className="!mb-3 text-sm text-muted">{cite}</p>
      <dl className="grid gap-2 sm:grid-cols-[7.5rem_1fr] sm:gap-x-4">
        <dt className="text-sm font-medium text-text">Supports</dt>
        <dd className="text-base">{supports}</dd>
        <dt className="text-sm font-medium text-text">Does not</dt>
        <dd className="text-base">{against}</dd>
      </dl>
    </li>
  );
}

export function Scheduling({ guide }: { guide: SchedulingGuide }) {
  const { constants: k, intervals, day, recall, reviewOrder, newCards } = guide;
  const target = percent(k.retention);
  const ladderLength = intervals.ladders[0]?.steps.length ?? 0;
  const curveDays = intervals.curves.series.map((s) => s.interval);
  const learned = intervals.learnedCards;
  const forgetting = intervals.forgetting;
  const newCardGood = intervals.firstGrade.find((g) => g.rating === 3);

  const orderRow = (id: ReviewOrderId) => reviewOrder.rows.find((r) => r.id === id);
  const lymiOrder = orderRow("lymi");
  const highest = orderRow("highest");
  const ruleRow = (id: NewCardRuleId) => newCards.rows.find((r) => r.id === id);
  const lymiRule = ruleRow("lymi");
  const halving = ruleRow("halving");

  // The stopped review: which cards it left waiting, and the card both days drew next.
  const stopped = day.day.slice(0, day.stopAfter);
  const lastSeen = new Map(stopped.map((t) => [t.card, t]));
  const waiting = new Set([...lastSeen.values()].filter((t) => t.missed).map((t) => t.card));
  const resumedCard = day.day[day.stopAfter]?.card;

  const tally = (kind: string) => day.day.filter((t) => t.kind === kind).length;
  const returnsByCard = new Map<number, number>();
  for (const t of day.day) {
    if (t.kind === "return") returnsByCard.set(t.card, (returnsByCard.get(t.card) ?? 0) + 1);
  }
  const [busiest, busiestReturns] =
    [...returnsByCard.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];

  return (
    <div className="doc-prose">
      <Lead>
        Two questions decide every review: when a card is due, and which due card you see next. FSRS
        answers the first and a draw answers the second. Every number on this page comes from Lymi’s
        code when the site is built, so it stays current.
      </Lead>

      <H2>FSRS decides when a card is due</H2>
      <p>
        Lymi uses <a href="https://github.com/open-spaced-repetition/awesome-fsrs/wiki">FSRS</a>{" "}
        version 6 with its default weights. FSRS tracks three numbers for each way a card is asked.
      </p>
      <Defs
        items={[
          {
            term: "Retrievability",
            def: "The chance you’d recall the card now. It starts at 100% after a review and falls from there.",
          },
          {
            term: "Stability",
            def: "Days until retrievability falls to 90%. It grows each time you remember the card.",
          },
          {
            term: "Difficulty",
            def: "How hard the card is for you, from 1 to 10. Forgot and Hard raise it, Easy lowers it. The higher it is, the slower stability grows.",
          },
        ]}
      />
      <p>
        A card is due when its retrievability falls to <strong>{target}</strong>.{" "}
        {k.retention === 0.9
          ? "Stability is measured at 90% too, so a card’s interval equals its stability."
          : `Stability is measured at 90%, so aiming for ${target} makes intervals ${k.retention > 0.9 ? "shorter" : "longer"} than stability.`}
      </p>
      <Figure
        caption={`Recall after a Good review, for three cards. Each is due where its curve crosses ${target}: day ${curveDays.join(", day ")}. Stronger memories fade more slowly, so the gaps grow.`}
      >
        <ForgettingCurves curves={intervals.curves} retention={k.retention} />
      </Figure>
      <p>
        A higher target means shorter intervals and more reviews. The{" "}
        <a href="https://docs.ankiweb.net/deck-options.html">Anki manual</a> warns that the workload
        climbs fast above 90%. A lower target means fewer reviews and more forgotten cards.
      </p>

      <H3>The first grade sets the pace</H3>
      <p>Each row is a new card: one grade, then Good every time it comes due.</p>
      <div className="my-5">
        <Table>
          <thead>
            <tr>
              <Th>First grade</Th>
              {Array.from({ length: ladderLength }, (_, i) => (
                <Th key={String(i)} align="right">
                  {i === 0 ? "1st interval" : ordinalShort(i + 1)}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {intervals.ladders.map((l) => (
              <tr key={l.rating}>
                <Td className="whitespace-nowrap text-text">{GRADE_NAMES[l.rating]}</Td>
                {l.steps.map((s, i) => (
                  <Td key={String(i)} align="right" className="whitespace-nowrap">
                    {duration(s.minutes)}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <p>
        The minutes are FSRS’s learning step. Lymi doesn’t wait for them: a card still learning{" "}
        <a href="#missed-cards-come-back-in-the-same-review">comes back</a> after a few other cards
        in the same review.
      </p>

      <H3>On a learned card, only Forgot goes back</H3>
      <p>
        A card at each Good interval above, graded on its due day. Hard still moves it forward, just
        less than Good.
      </p>
      <div className="my-5">
        <Table>
          <thead>
            <tr>
              <Th>Current interval</Th>
              {[1, 2, 3, 4].map((r) => (
                <Th key={r} align="right">
                  {GRADE_NAMES[r as 1 | 2 | 3 | 4]}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {learned.map((c) => (
              <tr key={c.interval}>
                <Td className="whitespace-nowrap text-text">{days(c.interval)}</Td>
                {c.grades.map((g) => (
                  <Td key={g.rating} align="right" className="whitespace-nowrap">
                    {duration(g.minutes)}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <H3>Forgetting shrinks stability, not history</H3>
      <p>
        Forget a card with an interval of {days(forgetting.interval)} and it restarts at{" "}
        {duration(forgetting.forgot[1]?.minutes ?? 0)}, not the{" "}
        {duration(newCardGood?.minutes ?? 0)} of a new card. FSRS keeps part of its stability, so it
        climbs back faster.
      </p>
      <div className="my-5">
        <Table>
          <thead>
            <tr>
              <Th>Graded when due</Th>
              {Array.from({ length: forgetting.forgot.length }, (_, i) => (
                <Th key={String(i)} align="right">
                  {i === 0 ? "1st interval" : ordinalShort(i + 1)}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="whitespace-nowrap text-text">Good</Td>
              {forgetting.forgot.map((_, i) => (
                <Td key={String(i)} align="right" className="whitespace-nowrap">
                  {forgetting.remembered[i] ? duration(forgetting.remembered[i].minutes) : ""}
                </Td>
              ))}
            </tr>
            <tr>
              <Td className="whitespace-nowrap text-text">Forgot</Td>
              {forgetting.forgot.map((s, i) => (
                <Td key={String(i)} align="right" className="whitespace-nowrap">
                  {duration(s.minutes)}
                </Td>
              ))}
            </tr>
          </tbody>
        </Table>
      </div>

      <H3>Real intervals vary a little</H3>
      <p>
        FSRS shifts longer intervals by a few days at random, so cards learned together don’t all
        come due together. The tables show intervals before the shift. For example,{" "}
        {intervals.fuzz
          .slice(0, 3)
          .map((f) => `${days(f.days)} becomes ${f.min} to ${f.max} days`)
          .join(", ")}
        .
      </p>

      <H2>What can come up today</H2>
      <p>
        A card can be asked in several review modes, such as term → meaning. Each mode has its own
        schedule. A mode can come up today if:
      </p>
      <Checklist
        items={[
          <>It’s due before your day ends. Your day follows the review timezone in Settings.</>,
          <>
            Its card and deck are active, the card uses that mode, and you’re a member of the deck.
          </>,
          <>
            It’s the card’s next mode. Modes start one at a time, once the previous one reaches
            Review. A mode missing its cue, like a picture mode without a picture, is skipped.
          </>,
          <>
            You haven’t reviewed another mode of this card today. A revealed answer stays fresh for
            hours, so a second mode would be too easy.
          </>,
          <>It hasn’t used up today’s returns.</>,
        ]}
      />
      <p>
        The review, Today’s count, deck counts, the end of the day and reminders all use this rule,
        so they always agree. Modes start with meaning → term, the harder direction.{" "}
        <a href="#what-the-sources-support">The sources</a> explain why.
      </p>

      <H2>What comes next</H2>
      <p>
        Lymi stores nothing about a review. After each grade, it picks the next card from your
        cards, today’s grades and the date. It takes the first match below.
      </p>
      <Figure caption="Missed cards come first, then cards left learning. Ordinary draws fill the rest.">
        <Precedence carryOverEvery={k.carryOverEvery} />
      </Figure>

      <H3>Missed cards come back in the same review</H3>
      <p>
        Forgot is always a miss. Hard is a miss while a card is new or still learning. A missed card
        returns after a set number of other cards, not minutes, so a break doesn’t bring it back
        sooner. Returns count toward your daily goal.
      </p>
      <Figure
        caption={`Each gap varies by up to ${k.returnJitter}, so returns don’t fall into a pattern you could count.`}
      >
        <ReturnGaps gaps={k.returnGaps} jitter={k.returnJitter} />
      </Figure>

      <H3>Cards left learning come back first</H3>
      <p>
        If you stop while a missed card is still waiting, it stays in learning. The next day the
        draw shows it first, then one more every {k.carryOverEvery} attempts, so yesterday’s hard
        cards don’t pile up at the start.
      </p>

      <H3>Ordinary draws mix reviews and new cards</H3>
      <p>
        Every {ordinal(k.newCardSlotEvery)} ordinary draw is a new card. When reviews run out, every
        draw is. Returns and cards left learning don’t count toward the {k.newCardSlotEvery}.
      </p>
      <Figure
        caption={`The first ${k.newCardSlotEvery * k.oldestSlotEvery} ordinary draws. The pattern repeats.`}
      >
        <SlotPattern
          newEvery={k.newCardSlotEvery}
          oldestEvery={k.oldestSlotEvery}
          length={k.newCardSlotEvery * k.oldestSlotEvery}
        />
      </Figure>
      <p>
        Reviews are weighted by retrievability to the power of {k.reviewOddsPower}. Cards you’ll
        likely remember come up more often, but weak cards still appear.{" "}
        <a href="#review-order">The simulation</a> shows the trade-off.
      </p>
      <Figure caption={`Chance of being drawn, compared with a card at ${target}.`}>
        <OddsBars
          caption="Odds of a review by its retrievability"
          rows={[0.97, 0.9, 0.8, 0.7, 0.5].map((r) => {
            const odds = (r / k.retention) ** k.reviewOddsPower;
            return { label: percent(r), odds, value: `${odds.toFixed(2)}×` };
          })}
        />
      </Figure>
      <p>
        Of every {k.oldestSlotEvery} new-card slots, {k.oldestSlotEvery - 1} favour recent cards:
        odds halve every {k.unseenHalfLifeDays} days after a card is added. The{" "}
        {ordinal(k.oldestSlotEvery)} takes your oldest unstarted card, so a big deck you joined
        keeps moving while this week’s lesson comes first.
      </p>
      <Figure caption="Chance of being drawn in a recent slot, compared with a card added today.">
        <OddsBars
          caption="Odds of an unseen card by how long ago it was added"
          rows={[0, 7, 14, 28, 56].map((age) => {
            const odds = 0.5 ** (age / k.unseenHalfLifeDays);
            return {
              label: age === 0 ? "Today" : `${days(age)} ago`,
              odds,
              value: percent(odds, odds < 0.01 ? 1 : 0),
            };
          })}
        />
      </Figure>

      <H3>Every device draws the same order</H3>
      <p>
        The order looks random but isn’t. Each card’s place comes from a hash of the date, the card
        and the mode. The same cards and grades give the same next card after a reload, offline, on
        another device or in a single deck. Grades from another device can change what’s next. A new
        order starts at local midnight.
      </p>

      <H2>A day, attempt by attempt</H2>
      <p>
        This learner is simulated, not real. They added {day.lesson} cards every{" "}
        {day.lessonEveryDays} days and did {day.goal} attempts a day for {day.history} days. Here is
        their next day, run through Lymi’s draw and scheduler. Each tile is one attempt, and a card
        keeps its number all day. Hover or tap a tile to follow that card.
      </p>
      <Figure
        caption={
          <>
            {count(tally("review"))} reviews, {count(tally("unseen"))} new cards,{" "}
            {count(tally("return"))} returns and {count(tally("carry"))} left from yesterday.
            {busiest !== undefined &&
              ` Card ${busiest} came back ${busiestReturns} ${busiestReturns === 1 ? "time" : "times"}${busiestReturns === k.returnGaps.length ? ", the most a card can in a day" : ""}.`}
          </>
        }
      >
        <AttemptStrip tiles={day.day} label={`A simulated day of ${day.day.length} attempts`} />
        <StripLegend kinds={["review", "unseen", "return", "carry"]} />
      </Figure>

      <H3>A review stopped partway</H3>
      <p>
        The same learner stops after {day.stopAfter} attempts. {count(waiting.size)} missed{" "}
        {waiting.size === 1 ? "card is" : "cards are"} still waiting.
      </p>
      <Figure caption={`Before the stop. Ringed cards were missed and haven’t come back yet.`}>
        <AttemptStrip
          tiles={stopped}
          marked={waiting}
          label={`The first ${day.stopAfter} attempts`}
        />
      </Figure>
      <p>
        {day.resumed.same
          ? `Reopening the review later that day shows card ${resumedCard}, the same card the uninterrupted day showed next. Only the grades were saved.`
          : `Reopening the review later that day shows a different card from the uninterrupted day.`}{" "}
        If they wait until tomorrow, the waiting cards come first, {k.carryOverEvery} attempts
        apart.
      </p>
      <Figure caption="The next morning. Ringed cards are the ones left waiting.">
        <AttemptStrip
          tiles={day.tomorrow}
          marked={waiting}
          label="The first attempts of the next day"
        />
      </Figure>

      <H2>Why these weights</H2>
      <p>
        The weights come from a simulated year under each rule Lymi considered. Every rule uses the
        same draw with a different order, and every grade goes through the real scheduler. See{" "}
        <a href={`${REPO}/packages/core/simulation`}>the simulation code</a> and{" "}
        <a href={`${REPO}/docs/adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md`}>
          the decision
        </a>
        .
      </p>

      <H3>Review order</H3>
      <p>
        One learner, {reviewOrder.days} days, {reviewOrder.goal} attempts a day, one new card in{" "}
        {k.newCardSlotEvery}, averaged over {reviewOrder.seeds.length} runs. Remembered is the total
        retrievability of started cards on the last day. Late is cards more than a week overdue.
      </p>
      <div className="my-5">
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th align="right">Cards started</Th>
              <Th align="right">Remembered</Th>
              <Th align="right">Over a week late</Th>
            </tr>
          </thead>
          <tbody>
            {reviewOrder.rows.map((r) => (
              <tr key={r.id} className={rowClass(r.id === "lymi")}>
                <Td className="text-text">{REVIEW_ORDER_NAMES[r.id as ReviewOrderId]}</Td>
                <Td align="right">{count(r.introduced)}</Td>
                <Td align="right">{count(r.remembered)}</Td>
                <Td align="right">{count(r.late)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      {lymiOrder && highest && (
        <p>
          Highest recall first remembers the most,{" "}
          {moreThan(highest.remembered, lymiOrder.remembered)} more than Lymi. But it leaves{" "}
          {moreThan(highest.late, lymiOrder.late)} more cards over a week late and shows strong
          cards in the same order every day. Lymi leaves the fewest cards late. Lowest recall first,
          which Anki suggests for a large backlog, leaves the most late when the daily limit never
          lifts.
        </p>
      )}

      <H3>New cards</H3>
      <p>
        A {newCards.joinedDeck}-card deck joined on day one, a {newCards.lessonSize}-card lesson
        every {newCards.lessonEveryDays} days, and {newCards.goal} attempts a day for{" "}
        {newCards.days} days. Cards arrive faster than they can start.
      </p>
      <div className="my-5">
        <Table>
          <thead>
            <tr>
              <Th>Rule</Th>
              <Th align="right">Median lesson wait</Th>
              <Th align="right">90th percentile wait</Th>
              <Th align="right">Joined deck started</Th>
            </tr>
          </thead>
          <tbody>
            {newCards.rows.map((r) => (
              <tr key={r.id} className={rowClass(r.id === "lymi")}>
                <Td className="text-text">{NEW_CARD_NAMES[r.id as NewCardRuleId]}</Td>
                <Td align="right">{days(r.medianWait)}</Td>
                <Td align="right">{days(r.p90Wait)}</Td>
                <Td align="right">
                  {count(r.joinedStarted)} of {count(newCards.joinedDeck)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      {lymiRule && halving && (
        <p>
          Halving alone starts lessons fast but stalls the joined deck at{" "}
          {count(halving.joinedStarted)} cards. A floor lets old cards crowd out lessons. The
          oldest-card slot starts lessons in {days(lymiRule.medianWait)} at the median and starts{" "}
          {count(lymiRule.joinedStarted)} joined cards.
        </p>
      )}

      <Note title="What the simulations leave out">
        <p>
          Recall is modelled. Reviews succeed at their retrievability, new cards{" "}
          {percent(recall.unseen)} of the time, and returns and cards left learning{" "}
          {percent(recall.again)}. Every card has one mode and every day reaches the goal. Treat the
          results as direction, not measurement.
        </p>
      </Note>

      <H2>What the sources support</H2>
      <p>
        No study tests Lymi’s rules as a whole. Each source backs a part, and two point the other
        way.
      </p>
      <ul className="my-6 grid !list-none !ps-0">
        <Source
          href="https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm"
          title="FSRS: The Algorithm, and ABC of FSRS"
          cite="Open Spaced Repetition wiki, and ts-fsrs, the implementation Lymi runs"
          supports={
            <>
              What stability, difficulty and retrievability mean, the FSRS-6 curve, 90% as the
              default target, and that higher targets mean more reviews.
            </>
          }
          against={<>Which due card to show first, returns, or one mode per day.</>}
        />
        <Source
          href="https://docs.ankiweb.net/deck-options.html"
          title="Deck Options"
          cite="The Anki Manual"
          supports={
            <>
              Workload rising fast above 90%, short learning steps like 10 minutes, fixed orders
              making answers guessable, and hiding a card’s siblings until tomorrow.
            </>
          }
          against={
            <>
              Lymi’s review weighting. For a large backlog it recommends weakest cards first, and it
              gives no evidence for its warning about order.
            </>
          }
        />
        <Source
          href="https://forums.ankiweb.net/t/improving-sort-orders/50081"
          title="Improving sort orders"
          cite="Anki Forums, 2024, on Jarrett Ye’s sort-order simulations"
          supports={
            <>
              Under a daily cap, order matters, and highest recall first spends the least time per
              card remembered.
            </>
          }
          against={
            <>
              A weighted random order, which it didn’t test. It used 80% retention and a heavy
              backlog, and lowest recall first remembered the most cards.
            </>
          }
        />
        <Source
          href="https://doi.org/10.1073/pnas.1815156116"
          title="Enhancing human learning via spaced repetition optimization"
          cite="Tabibian, Upadhyay, De, Zarezade, Schölkopf and Gomez-Rodriguez, PNAS, 2019"
          supports={<>Randomized review timing, set by a memory model.</>}
          against={
            <>
              Favouring cards you’ll likely recall. It reviews an item more the likelier it is
              forgotten, has no daily cap, and uses Duolingo logs rather than an experiment.
            </>
          }
        />
        <Source
          href="https://help.supermemo.org/wiki/Priority_queue"
          title="Priority queue"
          cite="SuperMemo Help"
          supports={<>Strict priority order has flaws, and some randomness helps.</>}
          against={
            <>
              How much randomness to use. Too much undoes the priorities, and its priority is set by
              the learner, not predicted recall.
            </>
          }
        />
        <Source
          href="https://doi.org/10.1177/0033688209343854"
          title="The effects of receptive and productive learning of word pairs on vocabulary knowledge"
          cite="Webb, RELC Journal, 2009"
          supports={
            <>
              Starting with meaning → term. Productive learning beat receptive learning on most
              tests.
            </>
          }
          against={
            <>
              Mode order in spaced review. It studied single sessions, and receptive learning was
              better for recognising meaning.
            </>
          }
        />
      </ul>
      <p>
        Two rules have no study behind them: one mode per card per day, and a random order so
        position can’t become a cue.
      </p>

      <NextLinks
        items={[
          {
            to: "/docs/cards",
            title: "Decks and cards",
            blurb: "How a card is shaped and which modes it uses.",
          },
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "The review queue and what the draw reads.",
          },
        ]}
      />
    </div>
  );
}
