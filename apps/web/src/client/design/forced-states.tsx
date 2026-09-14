import { MotionConfig } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";

/*
 * Interaction states a specimen can hold still, for the design system only. The dev stylesheet is
 * rewritten in place, so the product's CSS carries nothing for them:
 *
 * - `data-force="hover"`, `"focus"` or `"active"`, set by `Force`, holds an element in `:hover`,
 *   `:focus-visible` or `:active`, as if the pointer, the keyboard or a press were on it.
 * - `data-motion="reduce"` on an element stands in for `prefers-reduced-motion: reduce` inside it,
 *   and on the root for the whole page. Rules for `no-preference` follow the root alone.
 */

export type ForcedState = "hover" | "focus" | "active";

// A colon escaped with a backslash belongs to a class name such as `hoverable\:hover\:bg-hover`.
const PSEUDO = /(?<!\\):(hover|active|focus-visible|focus)(?![\w-])/g;
const HAS_PSEUDO = new RegExp(PSEUDO.source);
const STATE: Record<string, ForcedState> = {
  hover: "hover",
  active: "active",
  "focus-visible": "focus",
  focus: "focus",
};

const MOTION_QUERY = /^\(prefers-reduced-motion:\s*(reduce|no-preference)\)$/;
const REDUCE = ':where([data-motion="reduce"])';
const FULL = ':where(:root:not([data-motion="reduce"]))';

/** `:hover` becomes `:is(:hover, [data-force~="hover"])`: a superset where it is required and a subset under `:not()`. */
function forceSelector(selector: string) {
  return selector.replace(
    PSEUDO,
    (pseudo, name: string) => `:is(${pseudo}, [data-force~="${STATE[name]}"])`,
  );
}

/** Splits a selector list on its top-level commas. */
function selectors(list: string) {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(list.slice(start, i));
      start = i + 1;
    }
  }
  out.push(list.slice(start));
  return out.map((s) => s.trim());
}

function prefixed(list: string, scope: string) {
  return selectors(list)
    .map((s) => `${scope} ${s}`)
    .join(", ");
}

function prefixAll(rules: CSSRuleList, scope: string) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) rule.selectorText = prefixed(rule.selectorText, scope);
    // Rules nested inside a style rule already sit under its prefixed selector.
    else if (rule instanceof CSSGroupingRule) prefixAll(rule.cssRules, scope);
  }
}

type Parent = CSSStyleSheet | CSSGroupingRule | CSSStyleRule;

/** Swaps a motion media query for a root attribute test, keeping the rule's place in the cascade. */
function rewriteMotion(parent: Parent, index: number, rule: CSSMediaRule, scope: string) {
  const inner = Array.from(rule.cssRules);
  parent.deleteRule(index);
  if (parent instanceof CSSStyleRule) {
    // Declarations nested straight inside a style rule, such as a Tailwind `motion-reduce:` utility.
    const body = inner.map((r) => r.cssText).join("\n");
    parent.insertRule(`${scope} & { ${body} }`, index);
    return;
  }
  const replacement = rule.cssText.replace(/^@media[^{]*\{/, "@media all {");
  parent.insertRule(replacement, index);
  const inserted = parent.cssRules[index];
  if (inserted instanceof CSSMediaRule) prefixAll(inserted.cssRules, scope);
}

function rewrite(parent: Parent) {
  for (let i = 0; i < parent.cssRules.length; i++) {
    const rule = parent.cssRules[i];
    if (rule instanceof CSSMediaRule) {
      const motion = MOTION_QUERY.exec(rule.conditionText);
      if (motion) {
        rewriteMotion(parent, i, rule, motion[1] === "reduce" ? REDUCE : FULL);
      }
    }
    const current = parent.cssRules[i];
    if (current instanceof CSSStyleRule && HAS_PSEUDO.test(current.selectorText)) {
      current.selectorText = forceSelector(current.selectorText);
    }
    if (current instanceof CSSGroupingRule || current instanceof CSSStyleRule) rewrite(current);
  }
}

const done = new WeakSet<CSSStyleSheet>();

function rewriteSheets(doc: Document) {
  for (const sheet of Array.from(doc.styleSheets)) {
    if (done.has(sheet)) continue;
    done.add(sheet);
    try {
      rewrite(sheet);
    } catch {
      // A cross-origin sheet cannot be read, and holds none of Lymi's rules.
    }
  }
}

/** Rewrites the document's stylesheets now and again whenever the dev server swaps one. */
export function useForcedStates(doc: Document = document) {
  useEffect(() => {
    rewriteSheets(doc);
    const observer = new MutationObserver(() => rewriteSheets(doc));
    observer.observe(doc.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [doc]);
}

/**
 * Holds one element inside it in an interaction state: its first element, or the first match for
 * `on`, such as one option of a group or the input inside a slider's thumb.
 */
export function Force({
  state,
  on,
  children,
}: {
  state: ForcedState;
  on?: string | undefined;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const scope = ref.current;
    if (!scope) return;
    const apply = () => {
      const target = on ? scope.querySelector(on) : scope.firstElementChild;
      if (target && target.getAttribute("data-force") !== state) {
        target.setAttribute("data-force", state);
      }
    };
    apply();
    // Base UI mounts some parts a frame later.
    const observer = new MutationObserver(apply);
    observer.observe(scope, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [state, on]);
  return (
    <span ref={ref} className="contents">
      {children}
    </span>
  );
}

/** Its children move as they would under `prefers-reduced-motion: reduce`. Portals escape it. */
export function ReducedMotion({ children }: { children: ReactNode }) {
  return (
    <div data-motion="reduce" className="contents">
      <MotionConfig reducedMotion="always">{children}</MotionConfig>
    </div>
  );
}
