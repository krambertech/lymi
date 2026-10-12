import Svg, { Circle, Line, Rect } from "react-native-svg";
import { usePalette } from "../theme/palette";

/** Two kept days joined by a dashed bridge: the month's rest mark, small. */
export function RestGlyph() {
  const p = usePalette();
  return (
    <Svg width={50} height={18} viewBox="0 0 50 18" accessibilityElementsHidden>
      <Rect x={17} y={0} width={16} height={18} fill={`${p.amber}12`} />
      <Line x1={17} y1={1} x2={33} y2={1} stroke={p.amber} strokeWidth={2} strokeDasharray="4 3" />
      <Line
        x1={17}
        y1={17}
        x2={33}
        y2={17}
        stroke={p.amber}
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      {[9, 41].map((cx) => (
        <Circle
          key={cx}
          cx={cx}
          cy={9}
          r={8}
          fill={`${p.amber}29`}
          stroke={p.amber}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}
