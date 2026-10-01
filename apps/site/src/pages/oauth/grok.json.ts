import { grokClientMetadata } from "@lymi/core";
import { PUBLIC_SITE_ORIGIN } from "../../lib/origins";

export const prerender = true;

export function GET() {
  return Response.json(grokClientMetadata(PUBLIC_SITE_ORIGIN));
}
