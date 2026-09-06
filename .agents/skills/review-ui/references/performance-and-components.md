# Performance and components

Use this guidance only when the diff changes shared components, large or dynamic rendering, assets, loading or hydration boundaries, repeated motion work, or another plausible performance risk.

## Components

Look first for a smaller change, browser primitive, or existing Lymi component or token. A local exception does not need an abstraction; repeated behavior or an invariant that would otherwise drift may.

For a shared component, inspect the affected call sites and the contract they rely on. Report maintainability only when the diff demonstrates a concrete invalid state, lost semantic or behavioral capability, duplicated ownership, needless fork, or likely call-site regression. Preference for a different API is not evidence.

## Performance

Source can establish problems such as unbounded render work, repeated frame updates, missing cleanup, duplicated requests, avoidable layout shift, or layout-heavy animation. Consider real data size and usage before recommending memoization, virtualization, caching, or another layer.

Observe or measure before claiming jank, poor responsiveness, layout shift, or a metric regression. Record the environment, action, data size, and result. If evidence is unavailable, keep the concern under **Verification** rather than promoting suspicion to a finding.

Prefer removing work, narrowing an existing boundary, or reusing the current stack. Recommend a dependency, detector, build step, or caching layer only when a demonstrated repeated failure justifies its maintenance cost.
