import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { buttonClass } from "../components/Button";
import { Wordmark } from "../components/Logo";
import { AssistantChat } from "./AssistantChat";
import { CardBelt, CardColumn } from "./CardStream";
import { EnrichDemo } from "./EnrichDemo";
import { JoinBeta } from "./JoinBeta";
import { MemoryGraph } from "./MemoryGraph";
import { ReviewDemo } from "./ReviewDemo";
import { useWide } from "./useWide";

const TITLE = "Lymi · Keep what you learn";
const BLURB =
  "Lymi keeps the words, terms and ideas you pick up, and asks for them again before you " +
  "forget them. Spaced repetition, an AI that fills in the tedious fields, and an API and " +
  "MCP connection so anything you already learn with can add a card. Free during the private beta.";

interface SectionProps {
  id?: string | undefined;
  eyebrow?: string | undefined;
  title: string;
  lede?: string | undefined;
  children: ReactNode;
}

/** One idea per section: a heading, a sentence, and the thing itself. */
function Section({ id, eyebrow, title, lede, children }: SectionProps) {
  return (
    <section id={id} className="border-t border-edge px-5 py-16 @2xl:px-10 @2xl:py-24">
      <div className="mx-auto max-w-[860px]">
        {eyebrow && (
          <p className="text-2xs tracking-[0.08em] text-amber-text uppercase">{eyebrow}</p>
        )}
        <h2 className="mt-2 max-w-[18ch] text-3xl font-medium tracking-[-0.026em] text-text @2xl:text-4xl">
          {title}
        </h2>
        {lede && <p className="mt-3 max-w-[60ch] text-md text-text-2">{lede}</p>}
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}

/**
 * The public front door. One dark room lit by the lantern, seven sections, and one thing
 * to do at the end of them. It is deliberately dark whatever the reader's system says: the
 * page is a night scene, and the app is the surface that follows the OS.
 */
export function LandingView() {
  const hero = useRef<HTMLElement>(null);
  /** Where the pool of light sits inside the hero, in px. Null until the column reports it. */
  const [lamp, setLamp] = useState<{ x: number; y: number } | null>(null);
  const [nudge, setNudge] = useState({ x: 0, y: 0 });
  // Only one hero shape is ever mounted. Hiding the other with a class left it running and
  // still reporting where the lamp should go, which put the light in the corner of the page.
  const wide = useWide();

  // The page's own title, description and canonical, so a shared link says what it points at
  // and a crawler is not left with the app shell's defaults.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = TITLE;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousBlurb = description?.content;
    if (description) description.content = BLURB;

    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `${window.location.origin}/`;
    document.head.appendChild(canonical);

    // What Lymi is, for the search results and the assistants that read them.
    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Lymi",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description: BLURB,
      url: `${window.location.origin}/`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
    document.head.appendChild(jsonLd);

    return () => {
      document.title = previousTitle;
      if (description && previousBlurb !== undefined) description.content = previousBlurb;
      canonical.remove();
      jsonLd.remove();
    };
  }, []);

  // The landing page is one scene, in one theme. Put the room back the way it was on the
  // way out, so signing in lands on whichever theme the reader actually chose.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = "dark";
    return () => {
      if (previous) root.dataset.theme = previous;
      else delete root.dataset.theme;
    };
  }, []);

  // The lamp sits where the lit card is. The pointer only nudges it, so it never jumps.
  const onLampMove = useCallback((point: { x: number; y: number }) => {
    const el = hero.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setLamp({ x: point.x - r.left, y: point.y - r.top });
  }, []);

  useEffect(() => {
    const el = hero.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setNudge({
        x: ((e.clientX - r.left) / r.width - 0.5) * 52,
        y: ((e.clientY - r.top) / r.height - 0.5) * 26,
      });
    };
    const onLeave = () => setNudge({ x: 0, y: 0 });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // With the belt the light belongs in the middle, where the belt passes through it.
  const lampStyle = {
    "--lamp-x": wide && lamp ? `${lamp.x + nudge.x}px` : "50%",
    "--lamp-y": wide && lamp ? `${lamp.y + nudge.y}px` : "78%",
  } as CSSProperties;

  return (
    <div className="@container min-h-dvh bg-canvas text-text">
      {/* ---- 1. Keep what you learn ---- */}
      <header ref={hero} className="relative isolate overflow-hidden">
        <div className="lamp-pool -z-10" style={lampStyle} aria-hidden="true" />

        <nav className="mx-auto flex max-w-[1040px] items-center justify-between px-5 pt-6 @2xl:px-10">
          <Wordmark size={19} className="text-text" title="Lymi" />
          <div className="flex items-center gap-1">
            <Link to="/docs" className={buttonClass("ghost", "sm")}>
              Docs
            </Link>
            <a href="#join" className={buttonClass("secondary", "sm")}>
              Join the beta
            </a>
          </div>
        </nav>

        <div
          className={clsx(
            "mx-auto grid max-w-[1040px] items-center gap-10 px-5 py-16 @2xl:px-10",
            wide && "grid-cols-[minmax(0,1fr)_292px] py-24",
          )}
        >
          <div>
            <h1 className="max-w-[11ch] text-4xl font-medium tracking-[-0.036em] text-text @2xl:text-5xl">
              Keep what you learn.
            </h1>
            <p className="mt-4 max-w-[34ch] text-md text-text-2">
              Words, terms, ideas. Lymi asks for them again before you forget them.
            </p>
            <a href="#join" className={buttonClass("primary", "lg", "mt-7")}>
              Join the private beta
            </a>
            <p className="mt-4 text-2xs tracking-[0.07em] text-faint uppercase">
              Free for everyone in the beta
            </p>
          </div>

          {/* The column needs room beside the headline; a narrow screen gets the belt instead. */}
          {wide && <CardColumn onLampMove={onLampMove} />}
        </div>

        {!wide && <CardBelt className="pb-14" />}
      </header>

      {/* ---- 2. How reviewing works ---- */}
      <Section
        eyebrow="How it works"
        title="Say how hard it was. Lymi picks the day."
        lede="Reveal the meaning, then rate the recall. That answer is the whole mechanic: it decides when the card comes back, from ten minutes to next week. Try it. The buttons say what each answer costs."
      >
        <ReviewDemo />
      </Section>

      {/* ---- 3. You write the word, the AI fills in the rest ---- */}
      <Section
        eyebrow="The AI"
        title="You write the word. The AI fills in the rest."
        lede="Meaning, an example, how to say it. Every field says whether it came from your lesson, the AI, or you, so AI text is never mistaken for something you were taught. Nothing you wrote gets overwritten, and anything you disagree with takes one tap to fix."
      >
        <EnrichDemo />
      </Section>

      {/* ---- 4. Ask your assistant ---- */}
      <Section
        eyebrow="Your other tools"
        title="Ask your assistant to add it"
        lede="If you already learn with Claude or ChatGPT, Lymi connects to them. A card gets added in the middle of the conversation you were having anyway, and it is an ordinary card from the moment it lands."
      >
        <AssistantChat />
        <p className="mx-auto mt-6 max-w-[460px] text-sm text-muted">
          Works with any assistant that speaks MCP.{" "}
          <Link to="/docs/mcp" className="text-amber-text underline underline-offset-2">
            Set it up in two minutes.
          </Link>
        </p>
      </Section>

      {/* ---- 5. Or wire it up yourself ---- */}
      <Section
        eyebrow="For anything else"
        title="Or wire it up yourself"
        lede="A read and write API with keys you control. Send a word from your notes app, a reading list, or a script you wrote on a Sunday."
      >
        <div className="mx-auto max-w-[560px] overflow-x-auto rounded-md bg-plate p-5 edge">
          <pre className="font-mono text-xs leading-[1.7] text-text-2">
            <code>
              <span className="text-faint"># Add a card from anything you already use</span>
              {"\n"}
              <span className="text-amber-text">POST</span> https://lymi.app/v1/cards{"\n\n"}
              {"{\n"}
              {'  "term": "hysteresis",\n'}
              {'  "deck": "Signals",\n'}
              {'  "enrich": true\n'}
              {"}\n\n"}
              <span className="text-faint">
                {"# 201. Meaning and example filled in.\n"}
                {"# Send it twice and Lymi tells you\n"}
                {"# which card you already have."}
              </span>
            </code>
          </pre>
        </div>
        <p className="mx-auto mt-6 max-w-[560px] text-sm text-muted">
          Everything an integration does shows up in Activity, so nothing lands in your decks
          unseen.{" "}
          <Link to="/docs/api" className="text-amber-text underline underline-offset-2">
            Read the API docs.
          </Link>
        </p>
      </Section>

      {/* ---- 6. Why this works ---- */}
      <Section
        eyebrow="Why this works"
        title="What happens to a thing you learned once"
        lede="Lymi schedules with FSRS, a modern spaced-repetition algorithm. The idea underneath it is older and well studied."
      >
        <MemoryGraph />
        <div className="mt-10 grid gap-8 @2xl:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium text-text">Recalling beats re-reading</h3>
            <p className="mt-2 text-base text-text-2">
              Pulling something out of memory does more for remembering it than looking at it again.
              Roediger and Karpicke showed this in 2006, and Dunlosky and colleagues rated practice
              testing among the most useful techniques across subjects in 2013. That is why a review
              asks you first and shows you second.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-text">Spread out, not crammed</h3>
            <p className="mt-2 text-base text-text-2">
              The same reviews spread over weeks hold better than the same reviews in one evening.
              Distributed practice earned the other top rating in that review. FSRS works out where
              your next gap should be from how the last recall went.
            </p>
          </div>
        </div>
        <p className="mt-8 text-xs text-faint">
          The curves above are illustrative. The evidence is for the methods Lymi uses, not a
          measurement of what Lymi produces.
        </p>
      </Section>

      {/* ---- 7. Join the beta ---- */}
      <Section
        id="join"
        eyebrow="The beta"
        title="Free while Lymi is in private beta"
        lede="Unlimited cards, every integration, and no card limit to work around. Access is invitation only for now, so joining the list means we will write to you when there is room."
      >
        <JoinBeta />
      </Section>

      <footer className="border-t border-edge px-5 py-10 @2xl:px-10">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-4">
          <Wordmark size={16} className="text-muted" title="Lymi" />
          <div className="flex flex-wrap gap-5 text-sm text-muted">
            <Link to="/docs" className="hoverable:hover:text-text">
              Docs
            </Link>
            <Link to="/docs/api" className="hoverable:hover:text-text">
              API
            </Link>
            <Link to="/docs/mcp" className="hoverable:hover:text-text">
              MCP
            </Link>
            <Link to="/login" className="hoverable:hover:text-text">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
