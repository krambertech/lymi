import { CHOICE_SLIDE } from "@lymi/design";
import * as Haptics from "expo-haptics";
import { useContext, useEffect, useRef } from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { spring, useReduceMotion } from "../theme/motion";
import { useRoom } from "../theme/palette";
import { FieldContext } from "./field";

const SLIDE = spring(CHOICE_SLIDE);
const TRAVEL = 20;

interface Props {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Named by its Field's label; this is for a switch standing alone. */
  accessibilityLabel?: string;
  disabled?: boolean;
}

/**
 * On or off, taking effect the moment it changes. Amber when on, as on the web, and drawn by Lymi
 * rather than iOS so it sits in a form with the other controls. forms.md "Choice controls".
 */
export function Switch({ checked, onCheckedChange, accessibilityLabel, disabled = false }: Props) {
  const field = useContext(FieldContext);
  const reduce = useReduceMotion();
  // At night a plate knob on a plate track all but vanishes, so the knob off is the muted ink.
  const dark = useRoom() === "dark";
  const off = disabled || field?.disabled;
  const toggle = () => {
    Haptics.selectionAsync();
    onCheckedChange(!checked);
  };
  const setPress = field?.setPress;
  // The row presses the latest toggle, so a handler that reads other state never goes stale.
  const latest = useRef(toggle);
  latest.current = toggle;
  useEffect(() => {
    setPress?.(off ? undefined : () => latest.current());
  }, [off, setPress]);
  const thumb = useAnimatedStyle(() => {
    const x = checked ? TRAVEL : 0;
    return { transform: [{ translateX: reduce ? x : withSpring(x, SLIDE) }] };
  });
  return (
    <Pressable
      onPress={off ? undefined : toggle}
      hitSlop={7}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? field?.label}
      accessibilityState={{ checked, disabled: !!off }}
      className={`h-[30px] w-[50px] justify-center rounded-full p-[3px] ${checked ? "bg-amber" : "border border-edge-2 bg-plate-2"} ${off && !field ? "opacity-45" : ""}`}
    >
      <Animated.View
        className={`size-6 rounded-full ${checked ? "bg-amber-ink" : dark ? "bg-muted" : "border border-edge-2 bg-plate"}`}
        style={[thumb, checked ? null : { marginStart: -1 }]}
      />
    </Pressable>
  );
}
