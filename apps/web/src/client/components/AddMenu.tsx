import { Trans, useLingui } from "@lingui/react/macro";
import { BookMarked, PenLine, Plus } from "lucide-react";
import { IconButton } from "./Button";
import {
  ResponsiveMenu,
  ResponsiveMenuContent,
  ResponsiveMenuItem,
  ResponsiveMenuShortcut,
  ResponsiveMenuTrigger,
} from "./ResponsiveMenu";

/**
 * One plus for both things a learner adds. It sits in the rail beside the mark on desktop and
 * in the page header on the phone, so capture is one tap from every screen. Round and amber:
 * capture is the app's standing action, and the only one that is on every screen.
 */
export function AddMenu({
  onAddCard,
  onCreateDeck,
  size = "md",
  align = "start",
  variant = "primary",
}: {
  onAddCard: () => void;
  onCreateDeck?: (() => void) | undefined;
  size?: "sm" | "md" | undefined;
  align?: "start" | "end" | undefined;
  variant?: "primary" | "secondary" | undefined;
}) {
  const { t } = useLingui();
  return (
    <ResponsiveMenu>
      <ResponsiveMenuTrigger
        render={
          <IconButton label={t`Add`} variant={variant} round size={size}>
            <Plus />
          </IconButton>
        }
      />
      <ResponsiveMenuContent label={t`Add`} align={align}>
        <ResponsiveMenuItem onClick={onAddCard}>
          <PenLine aria-hidden="true" />
          <Trans>New card</Trans>
          <ResponsiveMenuShortcut>N</ResponsiveMenuShortcut>
        </ResponsiveMenuItem>
        <ResponsiveMenuItem onClick={onCreateDeck} disabled={!onCreateDeck}>
          <BookMarked aria-hidden="true" />
          <Trans>New deck</Trans>
        </ResponsiveMenuItem>
      </ResponsiveMenuContent>
    </ResponsiveMenu>
  );
}
