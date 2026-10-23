# The day turns at the end of a review

The review that meets the day's goal, or finishes every card due below it, ends on a screen that marks the day: a spark leaves the lantern's flame for today's light, which fills, then hops on to the run's flame, which catches as the run rolls up by one. Under reduced motion the screen arrives with its final numbers in place. [motion.md](../../../../docs/design/system/motion.md#the-end-of-a-review) has the timings.

## Reach

Review every card due today, or enough to reach the daily goal, from Today's **Review** link or `/review`.

## Drive

[`day-turns.mjs`](day-turns.mjs), as `learner` from Today: read the run, follow **Review** in the Today region, and grade every due card **Good** until the end screen.

## End state

The end screen's heading says the day is done, the run under the lights reads one more day in a row than Today showed, and `/api/stats/streak` reports today's outcome as met or exhausted with `current` one higher than before.

## Gotchas

- The runner uses reduced motion, so this proves the final state, not the spark. Record the motion separately at full motion when the change is to the sequence itself.
- The learner's goal is 50 and 9 cards are due, so the day turns by finishing them: the heading is **You’re done for today**, not **Daily goal reached**.
