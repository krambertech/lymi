# Insights

Insights contains the learner’s review charts. Use neutral ink at graded opacity over `plate-2` for series. Amber is reserved for review-day indicators, today’s bar in Ahead and the Recall endpoint dot. Keep numeric labels neutral. Name the busiest upcoming day in text rather than highlighting it.

## Summary charts

Desktop shows Recall, Consistency, Cards and Ahead in a 2×2 grid. Each panel has a number and a sentence explaining it, including any relevant target or limitation. The day grid and Often forgotten follow at full width. [phone.md](system/phone.md#insights) defines the narrower layout.

Use fixed frames for comparisons. Consistency always shows thirty days, including unlit days before the first review. `RunStrip` joins consecutive reviewed days into continuous segments, without varying their intensity by review count. It shows consistency rather than workload.

Recall uses one tally mark per graded review until at least three time buckets exist, with forgotten attempts drawn heavier. After that it uses a line with a dot per bucket. Offer only period choices that the available history can distinguish. Place reference labels in a gutter beside the plot. Endpoint labels identify the covered span and last bucket’s value; the headline summarizes the whole period.

## Day by day

The grid uses one column per week and one row per weekday, Monday first. Keep localized narrow weekday labels outside the horizontal scroller. Mark months with short labels, without gaps between them. Include complete weeks, extending into the preceding month and through the current week. Open on today; arrows and scroll snapping move by month.

Show at least a year, extending further when history requires it. Do not shrink the frame to the learner’s first few reviews.

Each day uses three amber levels relative to that day’s goal. Changing today’s goal does not recolour a recorded past goal. Days from before goals and imported history use the current goal as their available reference. A day protected by nothing due or exhaustion below goal has an amber ring. Future days use a dashed border. Imported reviews shade their historical date but do not create a streak-protection ring.

The heading is **Day by day**. Omit a lifetime total beside it because the visible span changes. Each cell has an accessible description and the same text in its hover or tap tooltip. Hover uses the neutral overlay rather than adding another ring, since rings already identify today and protected days.
