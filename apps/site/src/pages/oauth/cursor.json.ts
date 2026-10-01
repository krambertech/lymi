import { cursorClientMetadata } from "@lymi/core";
import { PUBLIC_SITE_ORIGIN } from "../../lib/origins";

export const prerender = true;

export function GET() {
  return Response.json(cursorClientMetadata(PUBLIC_SITE_ORIGIN));
}
