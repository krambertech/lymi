import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { FileArchive, WifiOff } from "lucide-react";
import { useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useRef } from "react";
import { localizedPath } from "../../lib/routes";
import { ArrowLink } from "./ArrowLink";
import { Key } from "./CardScenes";
import { SectionTitle } from "./FeatureSection";
import { MultiDemo, PicturesDemo, TrickDemo } from "./FeatureStage";

interface CellProps {
  /** A tray hue; without one the cell is a quiet plate, for the small print. */
  hue?: number;
  title: ReactNode;
  body: ReactNode;
  children?: ReactNode;
  /** Two columns wide, with the copy beside the picture. */
  wide?: boolean;
}

function Cell({ hue, title, body, children, wide }: CellProps) {
  return (
    <li
      style={hue === undefined ? undefined : ({ "--tray-h": hue } as CSSProperties)}
      className={clsx(
        "flex flex-col gap-6 rounded-[24px] p-6 @2xl:p-7",
        hue === undefined ? "bg-plate-2" : "use-case-tile",
        wide &&
          "@4xl:col-span-2 @4xl:grid @4xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] @4xl:items-center @4xl:gap-8",
      )}
    >
      <div>
        <h3 className="text-xl leading-tight font-medium tracking-[-0.02em] text-balance text-text @2xl:text-2xl">
          {title}
        </h3>
        <p className="mt-2 max-w-[40ch] text-sm text-pretty text-text-2 @2xl:text-md">{body}</p>
      </div>
      {children && (
        <div
          className={clsx(
            "flex min-w-0 flex-1",
            hue === undefined ? "items-end" : "items-center justify-center",
          )}
        >
          {children}
        </div>
      )}
    </li>
  );
}

/** Plays a demo once its cell is on screen. */
function InView({ children }: { children: (play: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  return (
    <div ref={ref} className="flex w-full justify-center">
      {children(inView)}
    </div>
  );
}

function Keys() {
  return (
    <div aria-hidden="true" className="grid w-full max-w-[260px] gap-3">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-plate px-3 py-2.5 edge">
        <span className="text-sm text-text-2">
          <Trans>Add a card</Trans>
        </span>
        <span className="flex gap-1">
          <Key>⌃</Key>
          <Key>⌥</Key>
          <Key>L</Key>
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-plate px-3 py-2.5 edge">
        <span className="text-sm text-text-2">
          <Trans>Grade</Trans>
        </span>
        <span className="flex gap-1">
          {["1", "2", "3", "4"].map((key) => (
            <Key key={key}>{key}</Key>
          ))}
        </span>
      </div>
    </div>
  );
}

const IMPORTS = [
  { name: "Anki", href: "/docs/import-from-anki" },
  { name: "Quizlet", href: "/docs/import-from-quizlet" },
  { name: "Mochi", href: "/docs/import-from-mochi" },
  { name: "Noji", href: "/docs/import-from-noji" },
  { name: "Pleco", href: "/docs/import-from-pleco" },
];

function Small({ icon: Icon, children }: { icon: typeof WifiOff; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 self-start rounded-full bg-plate px-3 py-1.5 text-xs text-text-2 edge">
      <Icon aria-hidden="true" className="size-3.5 text-amber-text" />
      {children}
    </span>
  );
}

/** The everyday details, each in its own cell: what makes Lymi pleasant to use for years. */
export function FeatureBento() {
  const { i18n } = useLingui();
  return (
    <section data-nav="landing" className="px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto max-w-[1040px]">
        <div className="max-w-[620px]">
          <SectionTitle>
            <Trans>Small things, done well.</Trans>
          </SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">
            <Trans>Details you notice after a week of reviews.</Trans>
          </p>
        </div>
        <ul className="mt-12 grid gap-4 @4xl:grid-cols-3">
          <Cell
            wide
            hue={195}
            title={<Trans>Memory hooks and hints</Trans>}
            body={
              <Trans>
                Stuck on a card? Its hint gives you a way in, like a word root or a picture to
                imagine, without giving the answer away.
              </Trans>
            }
          >
            <InView>{(play) => <TrickDemo play={play} />}</InView>
          </Cell>
          <Cell
            hue={235}
            title={<Trans>Keyboard first</Trans>}
            body={
              <Trans>
                Add a card from any app on your Mac, or press ⌘K in the browser. Grade a review with
                1 to 4.
              </Trans>
            }
          >
            <Keys />
          </Cell>
          <Cell
            hue={350}
            title={<Trans>Pictures and four ways to ask</Trans>}
            body={<Trans>Add a picture to any card, then choose how a deck asks.</Trans>}
          >
            <InView>{(play) => <PicturesDemo play={play} />}</InView>
          </Cell>
          <Cell
            wide
            hue={150}
            title={<Trans>Made for every script</Trans>}
            body={
              <Trans>
                Furigana and pinyin over the characters, stress marks for Russian and Ukrainian,
                right-to-left text, and meanings in English, Ukrainian or Russian.
              </Trans>
            }
          >
            <MultiDemo play={false} />
          </Cell>
          <Cell
            wide
            hue={25}
            title={<Trans>Bring the decks you have</Trans>}
            body={
              <Trans>
                Move over from another app in a few minutes. Pictures come too, and so does your
                review history where the app keeps one.
              </Trans>
            }
          >
            <ul className="flex flex-wrap justify-center gap-1.5">
              {IMPORTS.map((app) => (
                <li key={app.name}>
                  <a
                    href={app.href}
                    className="flex h-10 items-center rounded-full bg-plate px-4 text-sm text-text edge hoverable:hover:bg-hover"
                  >
                    {app.name}
                  </a>
                </li>
              ))}
            </ul>
          </Cell>
          <Cell
            title={<Trans>Works offline</Trans>}
            body={<Trans>Review on the train. Everything syncs when you’re back online.</Trans>}
          >
            <Small icon={WifiOff}>
              <Trans>6 reviews waiting to sync</Trans>
            </Small>
          </Cell>
          <Cell
            title={<Trans>Yours to take</Trans>}
            body={<Trans>Export any deck to Anki, with its pictures and review history.</Trans>}
          >
            <ul className="flex flex-wrap gap-1.5 self-start">
              {[
                <Trans key="anki">Anki package</Trans>,
                <Trans key="lymi">Lymi file</Trans>,
                <Trans key="sheet">Spreadsheet</Trans>,
              ].map((format) => (
                <li
                  key={format.key}
                  className="flex items-center gap-1.5 rounded-full bg-plate px-3 py-1.5 text-xs text-text-2 edge"
                >
                  <FileArchive aria-hidden="true" className="size-3.5 text-amber-text" />
                  {format}
                </li>
              ))}
            </ul>
          </Cell>
          <Cell
            title={<Trans>Free</Trans>}
            body={<Trans>No trial, and no payment details to sign up.</Trans>}
          />
          <Cell
            title={<Trans>On your Mac too</Trans>}
            body={
              <Trans>What’s due sits in the menu bar, and a new card is one shortcut away.</Trans>
            }
          >
            <ArrowLink href={localizedPath("download", i18n.locale)} className="self-start">
              <Trans>Lymi for Mac</Trans>
            </ArrowLink>
          </Cell>
        </ul>
      </div>
    </section>
  );
}
