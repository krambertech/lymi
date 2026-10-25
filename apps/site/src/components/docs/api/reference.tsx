import { API_RESOURCES } from "@lymi/core/api-resources";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo } from "react";
import { allSchemas, type Defs, type Doc, schemaHomes } from "../openapi";
import { OPENAPI_URL } from "../origin";
import { Note, slug } from "../Prose";

export interface Reference {
  doc: Doc;
  defs: Defs;
  /** The resource slug that shows each named schema. */
  homes: Map<string, string>;
  /** The resource page being read, or undefined on the overview. */
  here: string | undefined;
}

const ReferenceContext = createContext<Reference | undefined>(undefined);
export const ReferenceProvider = ReferenceContext.Provider;

export function useReference(): Reference {
  const ref = useContext(ReferenceContext);
  if (!ref) throw new Error("useReference needs a ReferenceProvider");
  return ref;
}

/** The OpenAPI document, fetched once per visit and read as a reference. */
export function useOpenApi(here: string | undefined) {
  const query = useQuery<Doc>({
    queryKey: ["openapi"],
    queryFn: async () => {
      const res = await fetch(OPENAPI_URL, { credentials: "omit", mode: "cors" });
      if (!res.ok) throw new Error(`The document answered ${res.status}`);
      return res.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
  const doc = query.data;
  // The page fills in after the fetch, so a link to a route or object lands once it exists.
  useEffect(() => {
    if (!doc || !location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [doc]);
  const reference = useMemo((): Reference | undefined => {
    if (!doc) return undefined;
    const defs = allSchemas(doc);
    return { doc, defs, homes: schemaHomes(doc, defs, API_RESOURCES), here };
  }, [doc, here]);
  return { reference, isPending: query.isPending, isError: query.isError };
}

/** Where a named schema is described: on this page, its resource's page, or the overview. */
export function schemaHref(name: string, ref: Reference): string {
  const anchor = `#schema-${slug(name)}`;
  const home = ref.homes.get(name);
  if (home === ref.here) return anchor;
  return home ? `/docs/api/${home}${anchor}` : `/docs/api${anchor}`;
}

export function Loading() {
  return (
    <div
      className="grid gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading the API reference"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-24 rounded-lg" />
      ))}
    </div>
  );
}

export function LoadFailed() {
  return (
    <Note tone="careful" title="The reference could not load">
      <p>
        Fetching <a href={OPENAPI_URL}>{OPENAPI_URL}</a> failed. Reload the page, or open the
        document directly to read it as JSON.
      </p>
    </Note>
  );
}
