import { clsx } from "clsx";
import { type ReactNode, useId } from "react";
import { Section, SectionHeader } from "./Section";

interface Props {
  id?: string | undefined;
  title: ReactNode;
  body: ReactNode;
  /** Links or marks under the copy. */
  after?: ReactNode;
  /** The demo that shows the claim. */
  children: ReactNode;
  /** Put the demo on the start side on wide screens; the copy still comes first on a phone. */
  demoFirst?: boolean | undefined;
  tinted?: boolean | undefined;
}

/** One claim beside the demo that proves it. */
export function FeatureSection({ id, title, body, after, children, demoFirst, tinted }: Props) {
  const titleId = useId();
  return (
    <Section id={id} surface={tinted ? "plate" : "canvas"} labelledBy={titleId}>
      <div
        className={clsx(
          "grid items-center gap-12 @4xl:gap-20",
          demoFirst
            ? "@4xl:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)]"
            : "@4xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]",
        )}
      >
        <div className={clsx(demoFirst && "@4xl:order-2 @4xl:justify-self-end")}>
          <SectionHeader id={titleId} title={title} body={body} after={after} measure="narrow" />
        </div>
        <div className={clsx("min-w-0 py-4", demoFirst ? "@4xl:order-1 @4xl:pr-6" : "@4xl:pl-6")}>
          {children}
        </div>
      </div>
    </Section>
  );
}

interface WideProps {
  id?: string | undefined;
  title: ReactNode;
  body: ReactNode;
  /** A link on to the rest, at the end of the heading's row on wide screens. */
  action?: ReactNode;
  /** The section's place for `site_link_followed`. */
  nav?: string | undefined;
  children: ReactNode;
}

/** A section with its title and copy above a wide demo. */
export function Wide({ id, title, body, action, nav, children }: WideProps) {
  const titleId = useId();
  return (
    <Section id={id} nav={nav} labelledBy={titleId}>
      <SectionHeader id={titleId} title={title} body={body} action={action} />
      {children}
    </Section>
  );
}
