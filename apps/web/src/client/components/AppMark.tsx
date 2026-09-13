import { t } from "@lingui/core/macro";
import { GEMINI_CLI_CLIENT_PATH } from "@lymi/core";
import { clsx } from "clsx";
import { publicSiteUrl } from "../lib/origins";

/**
 * Who is asking. An MCP client identifies itself with a Client ID Metadata Document, so its
 * `client_id` is an HTTPS URL and the document has to be served from that host. That host is
 * the only claim in the request that cannot be forged: `client_name` is whatever the client
 * typed, and `logo_uri` is an image the client chose.
 *
 * So the host is the trust signal and the mark is recognition, never proof. Marks ship with
 * the app for the clients we can draw; everything else gets a monogram. We deliberately never
 * render `logo_uri`: an attacker-controlled image on a permission screen, shown with the
 * confidence of a verified one, is how consent phishing works.
 *
 * A mark is drawn in its own brand colour where it has one. It is a quotation, not part of
 * Lymi's palette, and recognising it at a glance is the whole job. `brand` is left off for
 * marks whose brand is monochrome, which then take the room's ink.
 */

/**
 * Paths from simple-icons (CC0), and Gemini from lobe-icons (MIT). Trademarks belong to their
 * owners; used here to name them. `clientIds` names a client by the exact document Lymi
 * publishes for it, since its host is Lymi's own.
 */
const MARKS: {
  hosts: string[];
  clientIds?: string[];
  name: string;
  path: string;
  brand?: string;
}[] = [
  {
    hosts: ["claude.ai", "claude.com", "anthropic.com"],
    name: "Claude",
    brand: "#d97757",
    path: "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z",
  },
  {
    hosts: ["cursor.com", "cursor.sh"],
    name: "Cursor",
    path: "M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23",
  },
  {
    hosts: ["zed.dev"],
    name: "Zed",
    path: "M2.25 1.5a.75.75 0 0 0-.75.75v16.5H0V2.25A2.25 2.25 0 0 1 2.25 0h20.095c1.002 0 1.504 1.212.795 1.92L10.764 14.298h3.486V12.75h1.5v1.922a1.125 1.125 0 0 1-1.125 1.125H9.264l-2.578 2.578h11.689V9h1.5v9.375a1.5 1.5 0 0 1-1.5 1.5H5.185L2.562 22.5H21.75a.75.75 0 0 0 .75-.75V5.25H24v16.5A2.25 2.25 0 0 1 21.75 24H1.655C.653 24 .151 22.788.86 22.08L13.19 9.75H9.75v1.5h-1.5V9.375A1.125 1.125 0 0 1 9.375 8.25h5.314l2.625-2.625H5.625V15h-1.5V5.625a1.5 1.5 0 0 1 1.5-1.5h13.19L21.438 1.5z",
  },
  {
    hosts: [],
    clientIds: [publicSiteUrl(GEMINI_CLI_CLIENT_PATH)],
    name: "Gemini CLI",
    brand: "#3186ff",
    path: "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z",
  },
];

export interface AppIdentity {
  /**
   * What to call it. The recognised name for a host we ship a mark for, else the host
   * itself. Never the client's own `client_name`: that is text the client chose, and the
   * headline of a permission screen is the last place to put an unverified claim.
   */
  name: string;
  /** The name the client gave for itself, when it is unverified and adds anything. */
  claimed: string | null;
  /** The host of the client_id URL. Null when the client_id is not a URL. */
  host: string | null;
  /** True when the host is one we ship a mark for. Never means "safe", only "recognised". */
  recognised: boolean;
  path: string | null;
  /** The mark's own colour, or null for a brand that is monochrome. */
  brand: string | null;
}

/** Read the client's identity from its `client_id` URL and whatever name it sent. */
export function identifyApp(
  clientId: string | undefined,
  claimedName?: string | null,
): AppIdentity {
  const host = hostOf(clientId);
  const known = host
    ? MARKS.find(
        (m) =>
          m.clientIds?.includes(clientId ?? "") ||
          m.hosts.some((h) => h === host || host.endsWith(`.${h}`)),
      )
    : undefined;
  const claimed = claimedName?.trim() || null;
  return {
    name: known?.name ?? host ?? t`An app`,
    // A recognised host names itself; anywhere else the claim is shown as a claim, or not
    // at all when it only repeats the address.
    claimed: known || !claimed || claimed === host ? null : claimed,
    host,
    recognised: Boolean(known),
    path: known?.path ?? null,
    brand: known?.brand ?? null,
  };
}

export function hostOf(clientId: string | undefined): string | null {
  if (!clientId) return null;
  try {
    return new URL(clientId).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The app's tile. The same square the lantern sits in, so the two read as a pair. The mark
 * wears its own colour, which is what makes it recognisable; the tile around it stays a plain
 * plate so the colour is the only thing borrowed.
 */
export function AppMark({ app, className }: { app: AppIdentity; className?: string | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "edge grid shrink-0 place-items-center rounded-lg bg-plate text-text",
        className,
      )}
    >
      {app.path ? (
        <svg viewBox="0 0 24 24" className="size-1/2" fill={app.brand ?? "currentColor"}>
          <path d={app.path} />
        </svg>
      ) : (
        <span className="text-lg font-semibold uppercase text-text-2">{app.name.slice(0, 1)}</span>
      )}
    </span>
  );
}
