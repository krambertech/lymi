# Streak calendar

The streak sheet's month calendar, which pages by swipe and by its arrows from the first review's month to this one.

## Reach

The streak in Today's top bar opens the sheet at its peek, with the calendar's title and first rows showing.

## Drive

[`streak.yaml`](streak.yaml), as `learner`: open the sheet, check this month's title, swipe right and check last month's, swipe left and check this month's, then press **Previous month** and **Next month** and check each title.

## End state

The title names the month on screen, and the month [`streak.mjs`](streak.mjs) works out from `/api/stats/streak`. Paging writes nothing.

## Gotchas

- The swipes go by position, the one exception to finding controls by label: a day cell is too narrow to start a page-wide swipe from, and Maestro's `swipe` from an element runs from its centre, which can stop short of a page. The 91% row is the calendar's first at the peek on an iPhone 17.
- `env()` throws when the persona has no reviews before this month, because the calendar has nowhere to page to. `learner` is three weeks in, so from about the 22nd of a month its history sits inside that month and the flow cannot run until the 1st.
