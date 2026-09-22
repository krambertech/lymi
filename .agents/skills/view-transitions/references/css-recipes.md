# CSS recipes

Copy these into a new `apps/web/src/client/styles/view-transitions.css` and import it from [`apps/web/src/client/styles.css`](../../../../apps/web/src/client/styles.css) beside the other feature files. They are global pseudo-element selectors — Tailwind v4 does not generate them, and they cannot live in a component.

Every recipe assumes the typed router config from `SKILL.md`. Where types are unsupported the browser still runs an untyped transition, so the plain `::view-transition-old(root)` rules at the top are the floor everything else builds on.

## Timing

```css
:root {
  --vt-exit: 140ms;
  --vt-enter: 200ms;
  --vt-move: 380ms;
}
```

Lymi's motion is quick and warm. Anything over 400ms on a phone reads as sluggish, and the review screen is used one card after another — a transition the learner waits through twice is one they resent by the tenth.

## The floor: an untyped cross-fade

```css
::view-transition-old(root) {
  animation: var(--vt-exit) ease-in both vt-fade reverse;
}
::view-transition-new(root) {
  animation: var(--vt-enter) ease-out var(--vt-exit) both vt-fade;
}

@keyframes vt-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

## Directional navigation

```css
@keyframes vt-slide {
  from { translate: var(--vt-offset); }
  to   { translate: 0; }
}

html:active-view-transition-type(nav-forward)::view-transition-old(root) {
  --vt-offset: -24px;
  animation:
    var(--vt-exit) ease-in both vt-fade reverse,
    var(--vt-move) ease-in-out both vt-slide reverse;
}
html:active-view-transition-type(nav-forward)::view-transition-new(root) {
  --vt-offset: 24px;
  animation:
    var(--vt-enter) ease-out var(--vt-exit) both vt-fade,
    var(--vt-move) ease-in-out both vt-slide;
}

html:active-view-transition-type(nav-back)::view-transition-old(root) {
  --vt-offset: 24px;
  animation:
    var(--vt-exit) ease-in both vt-fade reverse,
    var(--vt-move) ease-in-out both vt-slide reverse;
}
html:active-view-transition-type(nav-back)::view-transition-new(root) {
  --vt-offset: -24px;
  animation:
    var(--vt-enter) ease-out var(--vt-exit) both vt-fade,
    var(--vt-move) ease-in-out both vt-slide;
}
```

24px, not the 60px a desktop app would use. The screen is 393px wide and the motion should read as a shift in depth, not as a page being thrown offstage.

## Shared element morph

```css
::view-transition-group(.morph) {
  animation-duration: var(--vt-move);
  animation-timing-function: ease-in-out;
}
::view-transition-image-pair(.morph) {
  animation-name: vt-via-blur;
}

@keyframes vt-via-blur {
  30% { filter: blur(3px); }
}
```

Give the element a unique name and the shared class on both screens:

```tsx
<article style={{ viewTransitionName: `card-${card.id}`, viewTransitionClass: "morph" }}>
```

The blur through the middle hides the raster stretch. Without it a morph between two differently-shaped boxes looks like a smear.

## Text morph

```css
::view-transition-group(.text-morph) {
  animation-duration: var(--vt-move);
}
::view-transition-old(.text-morph) {
  display: none;
}
::view-transition-new(.text-morph) {
  animation: none;
  object-fit: none;
  object-position: left top;
}
```

For a term that goes from list size to headline size. The old snapshot is hidden rather than scaled, so no ghost.

## Reveal when data lands

```css
::view-transition-new(.reveal) {
  animation: var(--vt-enter) ease-out both vt-rise;
}

@keyframes vt-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Wrap the state change in `document.startViewTransition` yourself when a query resolves into content that was a skeleton a moment ago.

## Persistent elements

Anything that stays on screen across a navigation — the nav bar, a sticky header — needs its own name, or it rides along with the page snapshot and slides off.

```css
::view-transition-group(persistent-nav) {
  animation: none;
  z-index: 100;
}
```

```tsx
<nav style={{ viewTransitionName: "persistent-nav" }}>
```

If the element uses `backdrop-filter`, animating the pair flashes. Hide the old snapshot instead:

```css
::view-transition-old(persistent-nav) { display: none; }
::view-transition-new(persistent-nav) { animation: none; }
```

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*),
  ::view-transition-group(*) {
    animation-duration: 1ms !important;
    animation-delay: 0s !important;
  }
}
```

View transitions ignore `prefers-reduced-motion` on their own — without this block, a learner who asked the OS for less motion gets every slide anyway. This is not optional.
