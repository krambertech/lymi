export interface AllowedVariant {
  lesson: string;
  in: "lesson" | "drills";
  id: string;
  variant: string;
  reason: string;
}

export const ALLOWED_VARIANTS: readonly AllowedVariant[] = [];
