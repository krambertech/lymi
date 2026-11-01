import { hues, palette } from "@lymi/design";
import type { CSSProperties } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  render,
  Section,
  Text,
} from "react-email";

/** The picture an email opens with: the brand lantern in its pool, or the deck being offered. */
export type Hero =
  | { kind: "lantern" }
  | {
      kind: "deck";
      name: string;
      meta: string;
      hue: number;
      /** Who offers the deck, drawn in ink where the byline has `<0/>`. */
      inviter: string;
      initials: string;
      /** The translated byline, with `<0/>` where the translator put the inviter's name. */
      byline: string;
    };

/** One piece of an email's body, drawn the same way in every kind. */
export type Block =
  | { type: "text"; text: string }
  | { type: "note"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "code"; code: string }
  | { type: "fallback"; label: string; url: string }
  | { type: "details"; lines: string[] };

/** One side of a card as an email can draw it: plain text, in its own language and direction. */
export interface EmailCardSide {
  text: string;
  lang?: string | undefined;
  dir: "ltr" | "rtl" | "auto";
}

/** A learning email: its line under the heading, and the card its button belongs to. */
export interface LearningBody {
  line: string;
  card?:
    | {
        front: EmailCardSide;
        /** Set when the email teaches a new card, so both sides show. */
        back?: EmailCardSide | undefined;
        /** The card's deck, named on it once the email counts more than one deck. */
        deck?: string | undefined;
        button: { label: string; url: string };
      }
    | undefined;
  /** The button of an email with no card to show. */
  button?: { label: string; url: string } | undefined;
  /** Why the email came, and how to stop it. */
  why: string;
  stop: { label: string; url: string };
}

export interface ComposedEmail {
  subject: string;
  /** The line an inbox shows after the subject. */
  preview: string;
  heading?: string;
  hero?: Hero;
  blocks: Block[];
  /** Why the email came, under the plate. */
  footer: string[];
  /** Replaces `blocks` in the shape learning emails share. */
  learning?: LearningBody | undefined;
}

export interface EmailRenderOptions {
  language: string;
  /** Where `/brand/email/` images are served from: the product origin. */
  assetOrigin: string;
  siteUrl: string;
}

const light = palette.light;
const dark = palette.dark;
/** System faces only: a web font would make every opened email fetch from a third party. */
const FONT =
  "Onest, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const s = {
  body: { backgroundColor: light.canvas, margin: 0, padding: 0, fontFamily: FONT },
  container: { maxWidth: "520px", margin: "0 auto", padding: "32px 16px 24px" },
  plate: { backgroundColor: light.plate, borderRadius: "20px", overflow: "hidden" },
  inner: { padding: "28px 32px 32px" },
  heading: {
    margin: "0 0 12px",
    fontSize: "24px",
    lineHeight: "1.3",
    fontWeight: 500,
    color: light.ink,
  },
  text: {
    margin: "0 0 16px",
    fontSize: "15px",
    lineHeight: "1.6",
    color: light["ink-secondary"],
    whiteSpace: "pre-line",
  },
  note: {
    margin: "0 0 12px",
    fontSize: "13px",
    lineHeight: "1.55",
    color: light["ink-muted"],
    whiteSpace: "pre-line",
  },
  button: {
    display: "block",
    boxSizing: "border-box",
    width: "100%",
    margin: "8px 0 20px",
    padding: "14px 24px",
    borderRadius: "14px",
    backgroundColor: light.amber,
    color: light["amber-ink"],
    fontSize: "16px",
    fontWeight: 500,
    textAlign: "center",
    textDecoration: "none",
  },
  code: {
    margin: "4px 0 20px",
    padding: "16px",
    borderRadius: "14px",
    backgroundColor: light["plate-nested"],
    color: light.ink,
    fontSize: "32px",
    fontWeight: 500,
    letterSpacing: "0.3em",
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
  },
  link: { color: light["amber-text"], textDecoration: "none", wordBreak: "break-all" },
  footer: {
    margin: "0",
    padding: "16px 8px 0",
    fontSize: "12px",
    lineHeight: "1.7",
    color: light["ink-muted"],
    textAlign: "center",
  },
} satisfies Record<string, CSSProperties>;

/** Mail clients that honour the reader's dark setting read these; the rest keep the day room. */
function darkStyles(hero: Hero | undefined): string {
  const hue = hero?.kind === "deck" ? hues.tray.dark[hero.hue % hues.tray.dark.length] : null;
  return `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .lx-body, .lx-body > table > tbody > tr > td { background-color: ${dark.canvas} !important; }
  .lx-plate { background-color: ${dark.plate} !important; }
  .lx-strong { color: ${dark.ink} !important; }
  .lx-text { color: ${dark["ink-secondary"]} !important; }
  .lx-muted { color: ${dark["ink-muted"]} !important; }
  .lx-button { background-color: ${dark.amber} !important; color: ${dark["amber-ink"]} !important; }
  .lx-code { background-color: ${dark["plate-nested"]} !important; color: ${dark.ink} !important; }
  .lx-link { color: ${dark["amber-text"]} !important; }
  .lx-rule { background-color: ${dark["edge-strong"]} !important; }
  .lx-avatar { background-color: ${dark.plate} !important; color: ${dark["amber-text"]} !important; }
  ${hue ? `.lx-hue { background-color: ${hue} !important; }` : ""}
  .lx-light { display: none !important; }
  .lx-dark { display: block !important; max-height: none !important; }
}`;
}

/**
 * A picture drawn for each room. The night one is hidden inline, so a client that strips <style>
 * shows only the day one, and the dark-mode rule shows it instead.
 */
function RoomImage({
  name,
  width,
  height,
  alt,
  assetOrigin,
  centered,
}: {
  name: string;
  width: number;
  height: number;
  alt: string;
  assetOrigin: string;
  centered?: boolean;
}) {
  const src = (room: "light" | "dark") =>
    new URL(`/brand/email/${name}-${room}.png`, assetOrigin).toString();
  const style = centered ? { margin: "0 auto" } : {};
  return (
    <>
      <Img
        src={src("light")}
        width={width}
        height={height}
        alt={alt}
        className="lx-light"
        style={style}
      />
      <div
        className="lx-dark"
        // Outlook's own property, which React's style type does not list.
        style={
          { display: "none", maxHeight: 0, overflow: "hidden", msoHide: "all" } as CSSProperties
        }
      >
        <Img src={src("dark")} width={width} height={height} alt={alt} style={style} />
      </div>
    </>
  );
}

/** The lantern and wordmark, for an email that opens on something other than the lantern. */
function Lockup({ assetOrigin, centered }: { assetOrigin: string; centered?: boolean }) {
  return (
    <Section
      style={centered ? { margin: "0 0 16px", textAlign: "center" } : { margin: "0 0 24px" }}
    >
      <RoomImage
        name="lockup"
        width={72}
        height={36}
        alt="Lymi"
        assetOrigin={assetOrigin}
        centered={centered ?? false}
      />
    </Section>
  );
}

function LanternHero({ assetOrigin }: { assetOrigin: string }) {
  return (
    <Section style={{ textAlign: "center", paddingTop: "8px" }}>
      <RoomImage
        name="lantern"
        width={240}
        height={160}
        alt=""
        assetOrigin={assetOrigin}
        centered
      />
    </Section>
  );
}

/** The byline with the inviter's name in ink, on a line of its own when it leads. */
function Byline({ hero }: { hero: Extract<Hero, { kind: "deck" }> }) {
  const [before = "", after = ""] = hero.byline.split("<0/>");
  return (
    <>
      {before}
      <span className="lx-strong" style={{ color: light.ink, fontWeight: 500 }}>
        {hero.inviter}
      </span>
      {before.trim() ? " " : <br />}
      {after.trimStart()}
    </>
  );
}

/** The deck's cover, with the person offering it as its byline. */
function DeckHero({ hero }: { hero: Extract<Hero, { kind: "deck" }> }) {
  const tray = hues.tray.light[hero.hue % hues.tray.light.length];
  return (
    <Section className="lx-hue" style={{ backgroundColor: tray, padding: "28px 32px 28px" }}>
      <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "0 0 32px" }}>
        <tbody>
          <tr>
            <td style={{ paddingInlineEnd: "12px", verticalAlign: "middle" }}>
              <div
                className="lx-avatar"
                style={{
                  width: "40px",
                  height: "40px",
                  lineHeight: "40px",
                  borderRadius: "20px",
                  backgroundColor: light.plate,
                  color: light["amber-text"],
                  fontSize: "14px",
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                {hero.initials}
              </div>
            </td>
            <td style={{ verticalAlign: "middle" }}>
              <Text
                className="lx-text"
                style={{
                  ...s.note,
                  fontSize: "14px",
                  lineHeight: "1.4",
                  color: light["ink-secondary"],
                }}
              >
                <Byline hero={hero} />
              </Text>
            </td>
          </tr>
        </tbody>
      </table>
      <Text className="lx-strong" style={{ ...s.heading, fontSize: "28px", margin: "0 0 8px" }}>
        {hero.name}
      </Text>
      <Text className="lx-text" style={{ ...s.note, color: light["ink-secondary"], margin: 0 }}>
        {hero.meta}
      </Text>
    </Section>
  );
}

/** A term sized to fit the card: long ones step down rather than wrap to three lines. */
const termSize = (text: string) => (text.length > 22 ? "20px" : "26px");

function Side({
  side,
  style,
  className,
}: {
  side: EmailCardSide;
  style: CSSProperties;
  className: string;
}) {
  return (
    <div lang={side.lang} dir={side.dir} className={className} style={style}>
      {side.text}
    </div>
  );
}

/** A slice of the loose cards, as wide as the card. A client without images keeps a plain card. */
function PileSlice({ name, assetOrigin }: { name: string; assetOrigin: string }) {
  const src = (room: "light" | "dark") =>
    new URL(`/brand/email/${name}-${room}.png`, assetOrigin).toString();
  const image = { display: "block", width: "100%", height: "auto" } as const;
  return (
    <>
      <Img src={src("light")} width={408} alt="" className="lx-light" style={image} />
      <div
        className="lx-dark"
        style={
          { display: "none", maxHeight: 0, overflow: "hidden", msoHide: "all" } as CSSProperties
        }
      >
        <Img src={src("dark")} width={408} alt="" style={image} />
      </div>
    </>
  );
}

/**
 * The card on its loose pile, ending in its button. Gmail drops rotation, so the cards behind are
 * pictures above and below, and the picture above carries the plate's rounded top.
 */
function LearningCard({
  card,
  assetOrigin,
}: {
  card: NonNullable<LearningBody["card"]>;
  assetOrigin: string;
}) {
  return (
    <>
      <PileSlice name="pile-top" assetOrigin={assetOrigin} />
      <Section
        className="lx-plate"
        style={{
          backgroundColor: light.plate,
          borderRadius: "0 0 20px 20px",
          border: `1px solid ${light.edge}`,
          borderTop: 0,
        }}
      >
        <div style={{ padding: "20px 20px 44px", textAlign: "center" }}>
          {card.deck && (
            <Text className="lx-muted" style={{ ...s.note, margin: "0 0 18px" }}>
              {card.deck}
            </Text>
          )}
          <Side
            side={card.front}
            className="lx-strong"
            style={{
              fontSize: termSize(card.front.text),
              lineHeight: "1.2",
              fontWeight: 500,
              color: light.ink,
            }}
          />
          {card.back && (
            <>
              <div
                className="lx-rule"
                style={{
                  height: "1px",
                  width: "64px",
                  margin: "18px auto",
                  backgroundColor: light["edge-strong"],
                }}
              />
              <Side
                side={card.back}
                className="lx-text"
                style={{ fontSize: "17px", lineHeight: "1.4", color: light["ink-secondary"] }}
              />
            </>
          )}
        </div>
        <Button
          href={card.button.url}
          className="lx-button"
          style={{ ...s.button, margin: 0, borderRadius: "0 0 19px 19px" }}
        >
          {card.button.label}
        </Button>
      </Section>
      <PileSlice name="pile-foot" assetOrigin={assetOrigin} />
    </>
  );
}

/** The message on the canvas, with the card under it as its example. */
function LearningBodyView({
  email,
  body,
  options,
}: {
  email: ComposedEmail;
  body: LearningBody;
  options: EmailRenderOptions;
}) {
  return (
    <>
      <div style={{ padding: "0 8px" }}>
        <Lockup assetOrigin={options.assetOrigin} />
        <Text className="lx-strong" style={{ ...s.heading, margin: "0 0 8px" }}>
          {holdLastWords(email.heading ?? email.subject)}
        </Text>
        <Text
          className="lx-text"
          style={{ ...s.text, fontSize: "16px", margin: body.card ? "0 0 8px" : "0 0 22px" }}
        >
          {body.line}
        </Text>
      </div>
      {body.card && <LearningCard card={body.card} assetOrigin={options.assetOrigin} />}
      {body.button && (
        <Button href={body.button.url} className="lx-button" style={s.button}>
          {body.button.label}
        </Button>
      )}
      <Text className="lx-muted" style={s.footer}>
        {body.why}
        <br />
        <Link href={body.stop.url} className="lx-link" style={s.link}>
          {body.stop.label}
        </Link>
        {" · "}
        <Link href={options.siteUrl} className="lx-link" style={s.link}>
          lymi.app
        </Link>
      </Text>
    </>
  );
}

/** A wrapped heading of four words or more never leaves one word alone on its last line. */
function holdLastWords(text: string): string {
  const at = text.lastIndexOf(" ");
  return text.split(" ").length < 4 ? text : `${text.slice(0, at)}\u00a0${text.slice(at + 1)}`;
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return (
        <Text className="lx-text" style={s.text}>
          {block.text}
        </Text>
      );
    case "note":
      return (
        <Text className="lx-muted" style={s.note}>
          {block.text}
        </Text>
      );
    case "button":
      return (
        <Button href={block.url} className="lx-button" style={s.button}>
          {block.label}
        </Button>
      );
    case "code":
      return (
        <Text className="lx-code" style={s.code}>
          {block.code}
        </Text>
      );
    case "fallback":
      return (
        <Text className="lx-muted" style={s.note}>
          {block.label}
          <br />
          <Link href={block.url} className="lx-link" style={s.link}>
            {block.url}
          </Link>
        </Text>
      );
    case "details":
      return (
        <Text className="lx-muted" style={{ ...s.note, whiteSpace: "pre-line" }}>
          {block.lines.join("\n")}
        </Text>
      );
  }
}

export function EmailTemplate({
  email,
  options,
}: {
  email: ComposedEmail;
  options: EmailRenderOptions;
}) {
  const { hero } = email;
  return (
    <Html lang={options.language} dir="ltr">
      <Head>
        <title>{email.subject}</title>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{darkStyles(hero)}</style>
      </Head>
      <Preview>{email.preview}</Preview>
      <Body className="lx-body" style={s.body}>
        <Container style={s.container}>
          {email.learning ? (
            <LearningBodyView email={email} body={email.learning} options={options} />
          ) : (
            <>
              {hero?.kind === "deck" && <Lockup assetOrigin={options.assetOrigin} centered />}
              <Section className="lx-plate" style={s.plate}>
                {hero?.kind === "lantern" && <LanternHero assetOrigin={options.assetOrigin} />}
                {hero?.kind === "deck" && <DeckHero hero={hero} />}
                <Section
                  style={{
                    ...s.inner,
                    ...(hero?.kind === "lantern" ? { paddingTop: "8px", textAlign: "center" } : {}),
                  }}
                >
                  {!hero && <Lockup assetOrigin={options.assetOrigin} />}
                  {email.heading && (
                    <Text className="lx-strong" style={s.heading}>
                      {email.heading}
                    </Text>
                  )}
                  {email.blocks.map((block) => (
                    <BlockView key={JSON.stringify(block)} block={block} />
                  ))}
                </Section>
              </Section>
              <Text className="lx-muted" style={s.footer}>
                {email.footer.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                <Link href={options.siteUrl} className="lx-link" style={s.link}>
                  lymi.app
                </Link>
              </Text>
            </>
          )}
        </Container>
      </Body>
    </Html>
  );
}

export async function renderEmailHtml(
  email: ComposedEmail,
  options: EmailRenderOptions,
): Promise<string> {
  return render(<EmailTemplate email={email} options={options} />);
}
