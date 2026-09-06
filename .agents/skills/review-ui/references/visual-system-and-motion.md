# Visual system and motion

Use this guidance when the change affects hierarchy, layout rhythm, typography, color, surfaces, icons, illustration, learner-facing voice, or motion. Judge against Lymi's committed system and the affected task, not personal taste.

## Visual system and voice

Read `DESIGN.md` and inspect the `/design` route or a comparable shipped component when useful. Let `DESIGN.md` own token values, typography, surfaces, component shapes, emphasis, lantern behavior, motion, and responsive patterns.

A visual finding needs observable evidence: a contradiction with an applicable Lymi rule, hierarchy that obscures the task or state, inconsistent behavior among equivalent elements, content that becomes unreadable or unstable, or a one-off treatment that needlessly forks an established pattern. A preference for another density, radius, phrase, or composition is not a defect.

Inspect styling and component choices in code, then render claims that depend on appearance with realistic content. Consider optical details and other polish only after higher-priority behavior passes.

For language changes, use `CONTEXT.md`, `PRODUCT.md`, and nearby established copy. Report wording only when it harms meaning, recovery, trust, or product consistency.

## Motion

Review motion only when it is present or behavior depends on it. Identify what it communicates and whether its prominence fits how often it appears. Prefer immediate feedback when movement adds no useful state, spatial, or continuity cue.

Inspect normal and reduced-motion behavior. Meaning must survive the animation, and the reduced variant must preserve the state change. Use code to identify broad transitions or layout-heavy repeated work; use the running interface when timing, direction, interruption, origin, or smoothness determines the claim.

If the change uses the View Transitions API, verify the affected navigation relationship, fallback, and reduced-motion path rather than treating a firing animation as proof of correctness.

## Evidence

Name the applicable Lymi rule or established pattern, the rendered mismatch, and its source. For motion, record the trigger and the observed normal and reduced-motion outcomes; measure only when the finding depends on measurement.
