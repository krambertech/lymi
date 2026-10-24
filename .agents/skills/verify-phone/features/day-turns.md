# The day turns at the end of a review

The review that meets the day's goal, or finishes every card due below it, ends on a screen that marks the day: a spark leaves the lantern's flame for today's light, which fills, then hops on to the run's flame, which catches as the run rolls up by one, with a tick, a tap and a warm pulse. Under Reduce Motion the screen arrives with its final numbers in place. [motion.md](../../../../docs/design/system/motion.md#the-end-of-a-review) has the timings.

## Reach

Review every card due today, or enough to reach the daily goal, from Today's **Review** button.

## Drive

[`day-turns.yaml`](day-turns.yaml), as `learner` from Today: press **Review** and grade every due card **Good** until the end screen.

## End state

The end screen says the day is done and the run under the lights reads one more than the Worker's streak before the review. `/api/stats/streak` reports today's outcome as met or exhausted.

## Gotchas

- The learner's goal is 50 and 9 cards are due, so the day turns by finishing them: the heading is **You’re done for today**.
- The run's number and **days in a row** are separate texts, so the flow finds each on its own.
- Maestro cannot time a frame of the sequence; to show the spark, record the Simulator with `xcrun simctl io <udid> recordVideo` while the flow runs.
