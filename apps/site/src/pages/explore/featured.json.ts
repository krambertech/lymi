import type { APIRoute } from "astro";
import { featuredDecksResponse } from "../../lib/public-catalog";

export const prerender = false;

/** The free decks the homepage shows, which it reads after it loads. */
export const GET: APIRoute = (context) => featuredDecksResponse(context);
