import {
  BookMarked,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleUserRound,
  LayoutGrid,
  Library,
  Play,
  Plus,
  RotateCcw,
  Sun,
  X,
  Zap,
} from "lucide-react-native";
import Svg, { Circle, Path } from "react-native-svg";

/** Lucide's `contrast` with its half filled, as the web's state mark draws Learning. */
function CircleHalf({
  size,
  color,
  strokeWidth,
}: {
  size: number;
  color: string;
  strokeWidth: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
    >
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 18a6 6 0 0 0 0-12v12z" fill={color} />
    </Svg>
  );
}

/** The same Lucide icons the web uses, named for what they mean here. */
const ICONS = {
  today: Sun,
  library: BookMarked,
  you: CircleUserRound,
  deck: BookMarked,
  section: Library,
  plus: Plus,
  close: X,
  back: ChevronLeft,
  forward: ChevronRight,
  forgot: RotateCcw,
  hard: Brain,
  good: Check,
  easy: Zap,
  new: CircleDashed,
  learning: CircleHalf,
  known: CircleCheck,
  play: Play,
  alert: CircleAlert,
  widgets: LayoutGrid,
  reset: RotateCcw,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  colour,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  colour: string;
  strokeWidth?: number;
}) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={colour} strokeWidth={strokeWidth} />;
}
