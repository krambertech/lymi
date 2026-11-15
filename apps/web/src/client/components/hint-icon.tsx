import { clsx } from "clsx";
import { LifeBuoy, type LucideIcon, type LucideProps } from "lucide-react";
import { forwardRef } from "react";

/**
 * The hint's life buoy, raised 1.5 px at 16 px: Onest's capitals sit above the middle of their
 * line, and a full ring beside them shows it more than any other icon.
 */
export const HintIcon: LucideIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <LifeBuoy ref={ref} className={clsx("-translate-y-[9.375%]", className)} {...props} />
  ),
);
HintIcon.displayName = "HintIcon";
