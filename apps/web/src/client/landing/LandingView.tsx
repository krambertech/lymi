import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "../components/Button";
import { Lockup } from "../components/Logo";
import { productUrl } from "../lib/origins";
import { AssistantChat } from "./AssistantChat";
import { CardBelt, CardColumn } from "./CardStream";
import { EnrichDemo } from "./EnrichDemo";
import { JoinBeta } from "./JoinBeta";
import { ReviewDemo } from "./ReviewDemo";
import { WhyItWorks } from "./WhyItWorks";

export const LANDING_TITLE = "Lymi · Keep what you learn";
export const LANDING_BLURB =
  "Save a term while it is fresh. Lymi enriches the missing details and brings the card " +
  "back when recalling it will help most. Free during the private beta.";

const LOOP = [
  {
    title: "Capture it",
    body: "Save a term by hand, from an assistant, or through the API.",
  },
  {
    title: "Enrich it",
    body: "Let AI fill only the fields you left empty. Every source stays visible.",
  },
  {
    title: "Remember it",
    body: "Recall first, reveal second. Lymi schedules what comes next.",
  },
] as const;

/**
 * The public front door. It stays in Lymi's dark room, but changes pace as the story moves:
 * an atmospheric hero, a compact three-step loop, alternating product moments, a wide evidence
 * figure, and one quiet invitation.
 */
export function LandingView({ productOrigin }: { productOrigin?: string | undefined } = {}) {
  const openAppUrl = new URL("/", productOrigin ?? productUrl()).toString();
  const hero = useRef<HTMLElement>(null);
  const [lamp, setLamp] = useState<{ x: number; y: number } | null>(null);
  const [nudge, setNudge] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const previousTitle = document.title;
    document.title = LANDING_TITLE;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousBlurb = description?.content;
    if (description) description.content = LANDING_BLURB;

    const existingCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonical = existingCanonical ?? document.createElement("link");
    if (!existingCanonical) {
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/`;

    const existingJsonLd = document.querySelector<HTMLScriptElement>(
      'script[data-landing-structured-data="true"]',
    );
    const jsonLd = existingJsonLd ?? document.createElement("script");
    if (!existingJsonLd) {
      jsonLd.type = "application/ld+json";
      jsonLd.dataset.landingStructuredData = "true";
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Lymi",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description: LANDING_BLURB,
      url: `${window.location.origin}/`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });

    return () => {
      document.title = previousTitle;
      if (description && previousBlurb !== undefined) description.content = previousBlurb;
      if (!existingCanonical) canonical.remove();
      if (!existingJsonLd) jsonLd.remove();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = "dark";
    return () => {
      if (previous) root.dataset.theme = previous;
      else delete root.dataset.theme;
    };
  }, []);

  const onLampMove = useCallback((point: { x: number; y: number }) => {
    const el = hero.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setLamp({ x: point.x - r.left, y: point.y - r.top });
  }, []);

  useEffect(() => {
    const el = hero.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setNudge({
        x: ((e.clientX - r.left) / r.width - 0.5) * 40,
        y: ((e.clientY - r.top) / r.height - 0.5) * 20,
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

  const lampStyle = {
    "--lamp-x": lamp ? `${lamp.x}px` : "72%",
    "--lamp-y": lamp ? `${lamp.y}px` : "58%",
    "--lamp-nudge-x": `${nudge.x}px`,
    "--lamp-nudge-y": `${nudge.y}px`,
  } as CSSProperties;

  return (
    <div className="@container min-h-dvh bg-canvas text-text">
      <header ref={hero} className="relative isolate overflow-hidden">
        <div className="lamp-pool -z-10" style={lampStyle} aria-hidden="true" />

        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-[1120px] items-center justify-between px-5 pt-5 @2xl:px-10 @2xl:pt-7"
        >
          <a href="/" aria-label="Lymi home" className="rounded-xs py-1.5">
            <Lockup size={30} flicker glow />
          </a>
          <div className="flex items-center gap-1">
            <span className="hidden @2xl:contents">
              <a href="/docs" className={buttonClass("ghost", "sm")}>
                Docs
              </a>
            </span>
            <a href={openAppUrl} className={buttonClass("ghost", "sm")}>
              Open app
            </a>
            <a href="#join" className={buttonClass("secondary", "sm")}>
              Join the beta
            </a>
          </div>
        </nav>

        <div className="mx-auto grid min-h-[650px] max-w-[1120px] items-center gap-10 px-5 py-14 @2xl:grid-cols-[minmax(0,1fr)_clamp(250px,29vw,340px)] @2xl:px-10 @4xl:min-h-[720px]">
          <div className="relative z-10 min-w-0 max-w-[620px]">
            <h1 className="max-w-[10ch] text-5xl font-medium tracking-[-0.038em] text-text @4xl:text-[64px] @4xl:leading-[0.98]">
              Keep what you learn.
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg text-text-2 @2xl:text-xl">
              Save a term while it is fresh. Lymi enriches the missing details and brings the card
              back when recalling it will help most.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#join" className={buttonClass("primary", "lg")}>
                Join the private beta
              </a>
              <a
                href="#how-it-works"
                className="rounded-xs py-2 text-sm text-text underline decoration-muted underline-offset-4 transition-colors duration-150 hoverable:hover:text-amber-text"
              >
                See how Lymi works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">
              Free during the private beta. Invitation only.
            </p>

            <CardBelt onLampMove={onLampMove} className="-mx-5 mt-2 @2xl:hidden" />
          </div>

          <div
            className="hidden min-w-0 @2xl:block"
            style={{
              transform: `translate3d(${-nudge.x * 0.16}px, ${-nudge.y * 0.16}px, 0)`,
              transition: "transform 800ms cubic-bezier(0.19, 1, 0.22, 1)",
            }}
          >
            <CardColumn onLampMove={onLampMove} />
          </div>
        </div>
      </header>

      <main>
        <section aria-labelledby="loop-title" className="border-y border-edge px-5 @2xl:px-10">
          <h2 id="loop-title" className="sr-only">
            How Lymi works
          </h2>
          <ol className="mx-auto grid max-w-[1120px] @2xl:grid-cols-3">
            {LOOP.map((item, index) => (
              <li
                key={item.title}
                className="flex gap-4 border-b border-edge py-7 last:border-b-0 @2xl:border-r @2xl:border-b-0 @2xl:px-8 @2xl:first:pl-0 @2xl:last:border-r-0 @2xl:last:pr-0"
              >
                <span className="pt-0.5 text-xs tabular-nums text-amber-text">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-md font-medium text-text">{item.title}</h3>
                  <p className="mt-1 max-w-[32ch] text-sm text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-8 border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28"
        >
          <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] @4xl:gap-20">
            <div className="max-w-[430px]">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                Recall first. Reveal second.
              </h2>
              <p className="mt-5 text-md text-text-2">
                Look for the meaning before Lymi shows it. Then grade the recall. That one choice
                sets the next review: difficult cards return sooner, easy ones wait.
              </p>
              <p className="mt-5 text-sm text-muted">
                No points or streak pressure. Just the cards due today.
              </p>
            </div>
            <div className="min-w-0 py-4 @4xl:pl-6">
              <ReviewDemo />
            </div>
          </div>
        </section>

        <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] @4xl:gap-20">
            <div className="order-1 max-w-[430px] @4xl:order-2 @4xl:justify-self-end">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                Start with the term. Keep control of the rest.
              </h2>
              <p className="mt-5 text-md text-text-2">
                Add what you heard in the lesson. Lymi can enrich the missing meaning, example,
                pronunciation, and language without overwriting anything you entered.
              </p>
            </div>
            <div className="order-2 min-w-0 py-4 @4xl:order-1 @4xl:pr-6">
              <EnrichDemo />
            </div>
          </div>
        </section>

        <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] items-center gap-12 @4xl:grid-cols-[0.82fr_1.18fr] @4xl:gap-20">
            <div className="max-w-[420px]">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                Stay in the conversation.
              </h2>
              <p className="mt-5 text-md text-text-2">
                When a term appears while you are talking with an assistant, ask it to add the card
                there and then. The conversation continues; the card waits in Lymi.
              </p>
              <p className="mt-5 text-sm text-muted">
                Works with Claude, ChatGPT, and other assistants that support MCP.
              </p>
              <a
                href="/docs/mcp"
                className="mt-6 inline-block rounded-xs py-1 text-sm text-amber-text underline underline-offset-4"
              >
                Connect an assistant
              </a>
            </div>
            <div className="min-w-0 @4xl:pl-6">
              <AssistantChat />
            </div>
          </div>
        </section>

        <section className="flex min-h-[680px] items-center border-b border-edge bg-plate px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto w-full max-w-[1040px]">
            <div className="grid items-end gap-8 @4xl:grid-cols-[0.9fr_1.1fr] @4xl:gap-20">
              <h2 className="max-w-[12ch] text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                One endpoint. Everything else.
              </h2>
              <div className="max-w-[520px] @4xl:justify-self-end">
                <p className="text-md text-text-2">
                  Send a card from a reading list, notes app, or script. Include what you know; Lymi
                  keeps the source and lets you complete the card later.
                </p>
                <p className="mt-3 text-sm text-muted">
                  Each key is read-only or read-and-write, and API-created cards stay identifiable.
                </p>
                <a
                  href="/docs/api"
                  className="mt-6 inline-block rounded-xs py-1 text-sm text-amber-text underline underline-offset-4"
                >
                  Explore the API reference
                </a>
              </div>
            </div>

            <div className="mt-12 min-w-0 overflow-hidden rounded-xl bg-canvas edge">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-6 py-5 @2xl:px-8">
                <p className="text-xs text-muted">Create a card</p>
                <p className="font-mono text-xs text-text-2">
                  <span className="text-amber-text">POST</span> /api/cards
                </p>
              </div>
              <div className="grid @3xl:grid-cols-[1.08fr_0.92fr]">
                <pre className="overflow-x-auto p-6 font-mono text-xs leading-[1.8] text-text-2 @2xl:p-8 @2xl:text-sm">
                  <code>
                    {"{\n"}
                    {'  "deckId": "0mtoyiymqa34h1xeaqo",\n'}
                    {'  "term": "hysteresis",\n'}
                    {'  "source": "paper"\n'}
                    {"}"}
                  </code>
                </pre>
                <div className="border-t border-edge p-6 @2xl:p-8 @3xl:border-t-0 @3xl:border-l">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted">Response</p>
                    <p className="font-mono text-xs text-amber-text">201 Created</p>
                  </div>
                  <pre className="overflow-x-auto pt-5 font-mono text-xs leading-[1.8] text-text-2 @2xl:text-sm">
                    <code>
                      {"{\n"}
                      {'  "status": "added",\n'}
                      {'  "card": {\n'}
                      {'    "term": "hysteresis",\n'}
                      {'    "createdBy": "api"\n'}
                      {"  }\n"}
                      {"}"}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto max-w-[1040px]">
            <div className="mx-auto max-w-[680px] text-center">
              <h2 className="text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                The right moment matters.
              </h2>
              <p className="mt-5 text-md text-text-2">
                Memory fades. A well-timed recall strengthens it and lets the next gap grow. Lymi
                schedules with FSRS, then adapts to every grade.
              </p>
            </div>
            <div className="mt-14">
              <WhyItWorks />
            </div>
          </div>
        </section>

        <section id="join" className="scroll-mt-8 px-5 py-20 @2xl:px-10 @4xl:py-28">
          <div className="mx-auto grid max-w-[1040px] gap-10 rounded-2xl bg-plate-2 p-7 edge-inset @2xl:p-12 @4xl:grid-cols-[0.9fr_1.1fr] @4xl:items-center @4xl:gap-20 @4xl:p-16">
            <div>
              <h2 className="max-w-[12ch] text-4xl font-medium tracking-[-0.03em] text-text @2xl:text-5xl">
                Bring your next lesson with you.
              </h2>
              <p className="mt-5 max-w-[44ch] text-md text-text-2">
                Join the private beta for unlimited cards and every integration. We will write when
                there is room.
              </p>
            </div>
            <JoinBeta />
          </div>
        </section>
      </main>

      <footer className="border-t border-edge px-5 py-10 @2xl:px-10">
        <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-5">
          <Lockup size={18} className="text-muted" />
          <div className="flex flex-wrap gap-5 text-sm text-muted">
            <a href="/docs" className="rounded-xs hoverable:hover:text-text">
              Docs
            </a>
            <a href="/docs/api" className="rounded-xs hoverable:hover:text-text">
              API
            </a>
            <a href="/docs/mcp" className="rounded-xs hoverable:hover:text-text">
              MCP
            </a>
            <a href={openAppUrl} className="rounded-xs hoverable:hover:text-text">
              Open app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
