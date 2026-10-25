import { apiResourceBySlug } from "@lymi/core/api-resources";
import { routesOf } from "../openapi";
import { H2, Lead, slug as slugOf } from "../Prose";
import { Endpoint, EndpointIndex } from "./Endpoint";
import { Fields } from "./Fields";
import { LoadFailed, Loading, ReferenceProvider, useOpenApi } from "./reference";

/** A named schema as its own entry: a heading to link to, and its fields. */
export function ObjectEntry({ name }: { name: string }) {
  return (
    <section className="mb-10">
      <h3 id={`schema-${slugOf(name)}`} data-toc={name} className="!mt-0 font-mono !text-md">
        {name}
      </h3>
      <div className="rounded-md bg-plate px-4 py-4 edge">
        <SchemaFields name={name} />
      </div>
    </section>
  );
}

function SchemaFields({ name }: { name: string }) {
  return <Fields schema={{ $ref: `#/components/schemas/${name}` }} expand />;
}

/** One resource: its routes at a glance, each route in full, then the objects it returns. */
export function ResourcePage({ slug }: { slug: string }) {
  const resource = apiResourceBySlug(slug);
  const { reference, isPending, isError } = useOpenApi(slug);
  if (!resource) return null;
  const routes = reference ? routesOf(reference.doc, resource.name) : [];
  const objects = reference
    ? [...reference.homes].filter(([, home]) => home === slug).map(([name]) => name)
    : [];

  return (
    <div className="doc-prose">
      <Lead>{resource.description}</Lead>
      {isPending && <Loading />}
      {isError && <LoadFailed />}
      {reference && (
        <ReferenceProvider value={reference}>
          <EndpointIndex routes={routes} />
          <H2>Endpoints</H2>
          <div>
            {routes.map((route) => (
              <Endpoint key={`${route.method} ${route.path}`} route={route} />
            ))}
          </div>
          {objects.length > 0 && (
            <>
              <H2>Objects</H2>
              <p>
                The shapes these routes take and return. Every timestamp is an ISO 8601 string, and
                every id is a 19-character string that sorts by the time it was made.
              </p>
              {objects.map((name) => (
                <ObjectEntry key={name} name={name} />
              ))}
            </>
          )}
        </ReferenceProvider>
      )}
    </div>
  );
}
