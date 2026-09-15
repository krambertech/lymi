import type { I18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import type { JoinPreviewOut } from "@lymi/core";
import type { Context } from "hono";
import { configureHtml } from "./html";
import { serverI18n } from "./i18n";
import type { AppEnv } from "./index";
import { clearedJoinCookie } from "./join-cookie";
import { previewJoin, previewPublication } from "./services";

/** The element the client reads the preview from, so the page paints without a second request. */
export const JOIN_PREVIEW_ELEMENT_ID = "lymi-join-preview";

const STATUS = { live: 200, invalid: 404, off: 410, archived: 410 } as const;

/**
 * `/join/<token>` on the product origin. The Worker decides the link's state and writes the
 * title and Open Graph tags a chat preview reads; the product shell renders the page. ADR 0011.
 */
export async function joinPage(c: Context<AppEnv>) {
  const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  const preview = await previewJoin(
    c.get("db"),
    c.req.param("token") ?? "",
    session?.user.id ?? null,
  );
  return doorPage(c, preview, session !== null, "link");
}

/** `/add/<slug>`: where "Add to Lymi" on a published deck's public page lands. ADR 0020. */
export async function addPage(c: Context<AppEnv>) {
  const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  const preview = await previewPublication(
    c.get("db"),
    c.req.param("slug") ?? "",
    session?.user.id ?? null,
  );
  return doorPage(c, preview, session !== null, "publication");
}

async function doorPage(
  c: Context<AppEnv>,
  preview: JoinPreviewOut,
  signedIn: boolean,
  kind: DoorKind,
) {
  const headers = new Headers({
    "cache-control": "private, no-store",
    // A join token is in the path; no request from this page may carry it elsewhere.
    "referrer-policy": "same-origin",
  });

  // Back from sign-in: the session hook has joined or added, so go straight to the deck.
  if (c.req.query("continue") === "1" && signedIn) {
    headers.append("set-cookie", clearedJoinCookie(c.env.PRODUCT_URL));
    if (preview.deckId) {
      headers.set("location", `/library/${preview.deckId}`);
      return new Response(null, { status: 302, headers });
    }
  }

  const i18n = await serverI18n(negotiate(c.req.header("accept-language")));
  const shell = await c.env.ASSETS.fetch(new Request(new URL("/index.html", c.req.url)));
  const page = configureHtml(
    withJoinMetadata(shell, preview, i18n, new URL(c.req.path, c.env.PRODUCT_URL), kind),
    c.env,
  );
  for (const [key, value] of page.headers) {
    if (key.toLowerCase() === "content-type") headers.set(key, value);
  }
  return new Response(page.body, { status: STATUS[preview.status], headers });
}

type DoorKind = "link" | "publication";

function withJoinMetadata(
  shell: Response,
  preview: JoinPreviewOut,
  i18n: I18n,
  url: URL,
  kind: DoorKind,
) {
  const { title, description } = describePreview(preview, i18n, kind);
  const image = new URL("/icons/icon-512.png", url).toString();
  const meta = [
    ["property", "og:type", "website"],
    ["property", "og:site_name", "Lymi"],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:url", url.toString()],
    ["property", "og:image", image],
    ["name", "twitter:card", "summary"],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
  ] as const;
  const json = JSON.stringify(preview).replaceAll("<", "\\u003c");

  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(title);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute("content", description);
      },
    })
    .on("head", {
      element(element) {
        element.append(
          meta
            .map(
              ([key, name, content]) =>
                `<meta ${key}="${name}" content="${escapeAttribute(content)}">`,
            )
            .join(""),
          { html: true },
        );
        element.append(
          `<script type="application/json" id="${JOIN_PREVIEW_ELEMENT_ID}">${json}</script>`,
          { html: true },
        );
      },
    })
    .transform(shell);
}

export function describePreview(preview: JoinPreviewOut, i18n: I18n, kind: DoorKind = "link") {
  if (kind === "publication") return describePublication(preview, i18n);
  switch (preview.status) {
    case "live": {
      const deck = preview.deck;
      const name = deck?.name ?? "";
      const owner = deck?.owner.name ?? "";
      const total = deck?.total ?? 0;
      return {
        title: i18n._(msg`Join ${name} on Lymi`),
        description: i18n._(
          msg`${plural(total, { one: "# card", other: "# cards" })} from ${owner}. Join to review them on your own schedule.`,
        ),
      };
    }
    case "off":
      return {
        title: i18n._(msg`This join link is turned off`),
        description: i18n._(msg`Ask the person who shared it for a new link.`),
      };
    case "archived":
      return {
        title: i18n._(msg`This deck is archived`),
        description: i18n._(msg`Nobody can join it while it is archived.`),
      };
    case "invalid":
      return {
        title: i18n._(msg`This join link does not work`),
        description: i18n._(msg`Check that the whole link was copied, or ask for a new one.`),
      };
  }
}

function describePublication(preview: JoinPreviewOut, i18n: I18n) {
  switch (preview.status) {
    case "live": {
      const name = preview.deck?.name ?? "";
      const total = preview.deck?.total ?? 0;
      return {
        title: i18n._(msg`Add ${name} to Lymi`),
        description: i18n._(
          msg`${plural(total, { one: "# card", other: "# cards" })}. Add the deck to review them on your own schedule.`,
        ),
      };
    }
    case "off":
      return {
        title: i18n._(msg`This deck is no longer published`),
        description: i18n._(msg`People who added it keep studying it, but nobody new can add it.`),
      };
    case "archived":
      return {
        title: i18n._(msg`This deck is archived`),
        description: i18n._(msg`Nobody can add it while it is archived.`),
      };
    case "invalid":
      return {
        title: i18n._(msg`There is no deck at this address`),
        description: i18n._(msg`Check that the whole link was copied.`),
      };
  }
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** The first supported language the browser asks for. Chat crawlers usually send none. */
export function negotiate(header: string | undefined): string {
  for (const part of (header ?? "").split(",")) {
    const language = part.split(";")[0]?.trim().toLowerCase().split("-")[0];
    if (language === "en" || language === "uk" || language === "ru") return language;
  }
  return "en";
}
