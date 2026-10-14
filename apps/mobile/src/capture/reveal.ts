import { useRef } from "react";
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from "react-native";

/** Room left between a revealed field and the scroll view's edge. */
const MARGIN = 16;

/** Scrolls a form so the field being added or typed in stays in view; spread `scroll` on its ScrollView. */
export function useReveal() {
  const ref = useRef<ScrollView>(null);
  const view = useRef({ height: 0, offset: 0 });
  return {
    scroll: {
      ref,
      scrollEventThrottle: 16,
      onLayout: (e: LayoutChangeEvent) => {
        view.current.height = e.nativeEvent.layout.height;
      },
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        view.current.offset = e.nativeEvent.contentOffset.y;
      },
    },
    reveal: (y: number, height: number) => {
      const { height: seen, offset } = view.current;
      if (!seen) return;
      if (y + height + MARGIN > offset + seen)
        ref.current?.scrollTo({ y: y + height + MARGIN - seen, animated: true });
      else if (y - MARGIN < offset)
        ref.current?.scrollTo({ y: Math.max(0, y - MARGIN), animated: true });
    },
  };
}
