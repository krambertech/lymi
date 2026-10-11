import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { Rating } from "@lymi/core";
import { View } from "react-native";
import { type Palette, usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";

export const GRADES: {
  rating: Rating;
  label: MessageDescriptor;
  icon: IconName;
  tint: keyof Palette;
}[] = [
  { rating: 1, label: msg`Forgot`, icon: "forgot", tint: "grade-forgot" },
  { rating: 2, label: msg`Hard`, icon: "hard", tint: "grade-hard" },
  { rating: 3, label: msg`Good`, icon: "good", tint: "grade-good" },
  { rating: 4, label: msg`Easy`, icon: "easy", tint: "grade-easy" },
];

/** A grade as the review draws it: its button's icon and colour, in a fixed square so a column lines up. */
export function GradeMark({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const p = usePalette();
  const grade = GRADES.find((g) => g.rating === rating) ?? GRADES[2];
  if (!grade) return null;
  return (
    <View
      className={`items-center justify-center ${size === "sm" ? "size-4" : "size-5"}`}
      importantForAccessibility="no-hide-descendants"
    >
      <Icon
        name={grade.icon}
        size={size === "sm" ? 12 : 16}
        colour={p[grade.tint]}
        strokeWidth={2.25}
      />
    </View>
  );
}
