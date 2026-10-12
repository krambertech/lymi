import {
  Activity,
  Anchor,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Bell,
  BookMarked,
  BookOpen,
  Brain,
  Bug,
  CalendarCheck,
  Camera,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleUserRound,
  CloudOff,
  Compass,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  FileUp,
  FolderInput,
  Image as ImageIcon,
  ImageMinus,
  Import,
  KeyRound,
  Languages,
  Layers,
  LayoutGrid,
  Library,
  Lightbulb,
  Link,
  Link2Off,
  ListFilter,
  Lock,
  LogOut,
  Mail,
  MailX,
  Megaphone,
  MessageSquare,
  Moon,
  NotebookPen,
  Pencil,
  PencilLine,
  Play,
  Plug,
  Plus,
  Pointer,
  Repeat2,
  RotateCcw,
  Search,
  Settings,
  Sparkle,
  Star,
  Sun,
  SunMoon,
  TextQuote,
  Trash2,
  Trophy,
  Undo2,
  UserMinus,
  UserPlus,
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
  down: ChevronDown,
  check: Check,
  more: Ellipsis,
  undo: Undo2,
  ai: Sparkle,
  lesson: BookOpen,
  manual: PencilLine,
  edit: Pencil,
  move: FolderInput,
  archive: Archive,
  meaning: Languages,
  modes: Repeat2,
  camera: Camera,
  picture: ImageIcon,
  example: TextQuote,
  pronunciation: AudioLines,
  source: Library,
  notes: NotebookPen,
  hook: Anchor,
  lock: Lock,
  important: Star,
  sun: Sun,
  moon: Moon,
  forgot: RotateCcw,
  hard: Brain,
  good: Check,
  easy: Zap,
  new: CircleDashed,
  learning: CircleHalf,
  known: CircleCheck,
  play: Play,
  pointer: Pointer,
  alert: CircleAlert,
  offline: CloudOff,
  widgets: LayoutGrid,
  reset: RotateCcw,
  show: Eye,
  hide: EyeOff,
  signOut: LogOut,
  email: Mail,
  longest: Trophy,
  reviewedDays: CalendarCheck,
  insights: ChartNoAxesColumn,
  activity: Activity,
  settings: Settings,
  feedback: MessageSquare,
  reminder: Bell,
  theme: SunMoon,
  import: Import,
  export: Download,
  keys: KeyRound,
  publish: Megaphone,
  web: ArrowUpRight,
  bug: Bug,
  idea: Lightbulb,
  explore: Compass,
  send: ArrowUp,
  apps: Plug,
  removePhoto: ImageMinus,
  restore: ArchiveRestore,
  fileIn: FileUp,
  joined: UserPlus,
  left: UserMinus,
  invite: Mail,
  uninvite: MailX,
  linkOn: Link,
  linkOff: Link2Off,
  search: Search,
  series: Layers,
  moveUp: ArrowUp,
  moveDown: ArrowDown,
  delete: Trash2,
  filter: ListFilter,
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
