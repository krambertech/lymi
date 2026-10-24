import type { APIRoute } from "astro";
import { menuShelvesResponse } from "../../lib/public-catalog";

export const prerender = false;

/** The Explore menu's shelves, which every page's nav reads when the menu first opens. */
export const GET: APIRoute = (context) => menuShelvesResponse(context);
