import { clsx } from "clsx";
import type { ReactNode } from "react";

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

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl">
      {children}
    </h2>
  );
}

/** One claim beside the demo that proves it. */
export function FeatureSection({ id, title, body, after, children, demoFirst, tinted }: Props) {
  return (
    <section
      id={id}
      className={clsx(
        "scroll-mt-8 border-b border-edge px-5 py-20 @2xl:px-10 @4xl:py-28",
        tinted && "bg-plate",
      )}
    >
      <div
        className={clsx(
          "mx-auto grid max-w-[1040px] items-center gap-12 @4xl:gap-20",
          demoFirst
            ? "@4xl:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)]"
            : "@4xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]",
        )}
      >
        <div className={clsx("max-w-[440px]", demoFirst && "@4xl:order-2 @4xl:justify-self-end")}>
          <SectionTitle>{title}</SectionTitle>
          <p className="mt-5 text-md text-pretty text-text-2">{body}</p>
          {after && <div className="mt-8">{after}</div>}
        </div>
        <div className={clsx("min-w-0 py-4", demoFirst ? "@4xl:order-1 @4xl:pr-6" : "@4xl:pl-6")}>
          {children}
        </div>
      </div>
    </section>
  );
}
