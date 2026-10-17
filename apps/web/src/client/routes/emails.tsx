import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { EmailPreview } from "../emails/email-preview";

const Search = z.object({
  kind: z.string().optional().catch(undefined),
  lang: z.enum(["en", "uk", "ru"]).optional().catch(undefined),
  room: z.enum(["light", "dark", "both"]).optional().catch(undefined),
  width: z.enum(["desktop", "phone"]).optional().catch(undefined),
  view: z.enum(["html", "text"]).optional().catch(undefined),
});

/** Every email Lymi sends, drawn by the production renderer. Local only: production redirects home. */
export const Route = createFileRoute("/emails")({
  validateSearch: Search,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw redirect({ to: "/" });
  },
  component: EmailPreview,
});
