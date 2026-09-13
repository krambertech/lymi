import { geminiCliClientMetadata } from "@lymi/core";
import { PUBLIC_SITE_ORIGIN } from "../../lib/origins";

export const prerender = true;

export function GET() {
  return Response.json(geminiCliClientMetadata(PUBLIC_SITE_ORIGIN));
}
