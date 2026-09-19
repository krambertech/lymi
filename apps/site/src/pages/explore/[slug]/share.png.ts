import type { APIRoute } from "astro";
import { shareImageResponse } from "../../../lib/public-share";

export const prerender = false;

export const GET: APIRoute = (context) => shareImageResponse(context, "en");
