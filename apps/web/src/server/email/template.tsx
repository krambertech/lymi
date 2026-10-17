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
  | { kind: "deck"; name: string; meta: string; hue: number; initials: string; invitedBy: string };

/** One piece of an email's body, drawn the same way in every kind. */
export type Block =
  | { type: "text"; text: string }
  | { type: "note"; text: string }
  | { type: "button"; label: string; url: string }
  | { type: "code"; code: string }
  | { type: "fallback"; label: string; url: string }
  | { type: "details"; lines: string[] };

export interface ComposedEmail {
  subject: string;
  /** The line an inbox shows after the subject. */
  preview: string;
  heading?: string;
  hero?: Hero;
  blocks: Block[];
  /** Why the email came, under the plate. */
  footer: string[];
}

export interface EmailRenderOptions {
  language: string;
  /** Where `/brand/email/` images are served from: the product origin. */
  assetOrigin: string;
  siteUrl: string;
}

const light = palette.light;
const dark = palette.dark;
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
    color: light.text,
  },
  text: { margin: "0 0 16px", fontSize: "15px", lineHeight: "1.6", color: light["text-2"] },
  note: { margin: "0 0 12px", fontSize: "13px", lineHeight: "1.55", color: light.muted },
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
    backgroundColor: light["plate-2"],
    color: light.text,
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
    color: light.muted,
    textAlign: "center",
  },
} satisfies Record<string, CSSProperties>;

/** Mail clients that honour the reader's dark setting read these; the rest keep the day room. */
function darkStyles(hero: Hero | undefined): string {
  const hue = hero?.kind === "deck" ? hues.tray.dark[hero.hue % hues.tray.dark.length] : null;
  return `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
.lx-dark { display: none; overflow: hidden; max-height: 0; mso-hide: all; }
@media (prefers-color-scheme: dark) {
  .lx-body, .lx-body > table > tbody > tr > td { background-color: ${dark.canvas} !important; }
  .lx-plate { background-color: ${dark.plate} !important; }
  .lx-strong { color: ${dark.text} !important; }
  .lx-text { color: ${dark["text-2"]} !important; }
  .lx-muted { color: ${dark.muted} !important; }
  .lx-button { background-color: ${dark.amber} !important; color: ${dark["amber-ink"]} !important; }
  .lx-code { background-color: ${dark["plate-2"]} !important; color: ${dark.text} !important; }
  .lx-link { color: ${dark["amber-text"]} !important; }
  .lx-avatar { background-color: ${dark.glass} !important; color: ${dark["amber-text"]} !important; }
  ${hue ? `.lx-hue { background-color: ${hue} !important; }` : ""}
  .lx-light { display: none !important; }
  .lx-dark { display: block !important; max-height: none !important; }
}`;
}

/** The lantern and wordmark, for an email that opens on something other than the lantern. */
function Lockup({ assetOrigin }: { assetOrigin: string }) {
  const image = (room: "light" | "dark") => ({
    src: new URL(`/brand/email/lockup-${room}.png`, assetOrigin).toString(),
    width: 72,
    height: 36,
    alt: "Lymi",
  });
  return (
    <Section style={{ margin: "0 0 24px" }}>
      <Img {...image("light")} className="lx-light" />
      <div className="lx-dark">
        <Img {...image("dark")} />
      </div>
    </Section>
  );
}

function LanternHero({ assetOrigin }: { assetOrigin: string }) {
  const image = (room: "light" | "dark") => ({
    src: new URL(`/brand/email/lantern-${room}.png`, assetOrigin).toString(),
    width: 240,
    height: 160,
    alt: "",
  });
  return (
    <Section style={{ textAlign: "center", paddingTop: "8px" }}>
      <Img {...image("light")} className="lx-light" style={{ margin: "0 auto" }} />
      <div className="lx-dark">
        <Img {...image("dark")} style={{ margin: "0 auto" }} />
      </div>
    </Section>
  );
}

function DeckHero({
  hero,
  assetOrigin,
}: {
  hero: Extract<Hero, { kind: "deck" }>;
  assetOrigin: string;
}) {
  const tray = hues.tray.light[hero.hue % hues.tray.light.length];
  return (
    <Section className="lx-hue" style={{ backgroundColor: tray, padding: "28px 32px 26px" }}>
      <Lockup assetOrigin={assetOrigin} />
      <Text className="lx-text" style={{ ...s.note, color: light["text-2"], margin: "0 0 6px" }}>
        {hero.meta}
      </Text>
      <Text className="lx-strong" style={{ ...s.heading, fontSize: "28px", margin: 0 }}>
        {hero.name}
      </Text>
    </Section>
  );
}

function Inviter({ hero }: { hero: Extract<Hero, { kind: "deck" }> }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "0 0 16px" }}>
      <tbody>
        <tr>
          <td style={{ paddingInlineEnd: "12px", verticalAlign: "middle" }}>
            <div
              className="lx-avatar"
              style={{
                width: "44px",
                height: "44px",
                lineHeight: "44px",
                borderRadius: "22px",
                backgroundColor: light.glass,
                color: light["amber-text"],
                fontSize: "15px",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {hero.initials}
            </div>
          </td>
          <td style={{ verticalAlign: "middle" }}>
            <Text className="lx-text" style={{ ...s.text, margin: 0 }}>
              {hero.invitedBy}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
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
        <link
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{darkStyles(hero)}</style>
      </Head>
      <Preview>{email.preview}</Preview>
      <Body className="lx-body" style={s.body}>
        <Container style={s.container}>
          <Section className="lx-plate" style={s.plate}>
            {hero?.kind === "lantern" && <LanternHero assetOrigin={options.assetOrigin} />}
            {hero?.kind === "deck" && <DeckHero hero={hero} assetOrigin={options.assetOrigin} />}
            <Section
              style={{
                ...s.inner,
                ...(hero?.kind === "lantern" ? { paddingTop: "8px", textAlign: "center" } : {}),
              }}
            >
              {!hero && <Lockup assetOrigin={options.assetOrigin} />}
              {hero?.kind === "deck" && <Inviter hero={hero} />}
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
