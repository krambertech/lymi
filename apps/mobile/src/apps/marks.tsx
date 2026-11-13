import { useLingui } from "@lingui/react/macro";
import type { AppIdentity } from "@lymi/client/app-marks";
import { BookA } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { usePalette } from "../theme/palette";
import { Chip } from "../ui/chip";
import { Icon, Text } from "../ui/primitives";

// Readwise's R from readwise.io, used only to name the app. Its counter is cut in the plate.
const R =
  "M357.879 353.562C368.295 370.889 376.79 376.649 394.166 378.713V396.04H308.441L228.139 262.029H208.076V349.866C208.076 373.385 213.884 376.649 238.603 378.713V396.04H109.199V378.713C133.918 376.649 139.726 373.337 139.726 349.866V153.6C139.726 129.697 134.686 126.817 109.199 124.753V107.426H242.395C322.696 107.426 364.647 124.321 364.647 183.695C364.647 228.622 342.808 250.077 298.793 257.469L357.879 353.562ZM219.644 135.505C212.684 135.505 208.076 140.449 208.076 147.888V234.046H241.291C275.658 234.046 296.105 221.662 296.105 183.743C296.105 145.393 275.658 135.505 242.443 135.505H219.644Z";
const BLOCK = "M309.691 117.748H184.799V236.976H309.691V117.748Z";
const COUNTER =
  "M293.999 138.338C287.183 150.865 297.694 209.904 297.694 209.904C297.838 213.023 295.727 215.759 292.655 216.431C292.655 216.431 228.289 216.719 207.025 234.383";

/** The plate tile every app's mark sits on, as the web draws it. */
function Tile({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View
      className="items-center justify-center border border-edge bg-plate"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}

/** A connected app's tile, never with the client's own logo. connected-apps.md. */
export function AppMark({ app, size = 40 }: { app: AppIdentity; size?: number }) {
  const p = usePalette();
  return (
    <Tile size={size}>
      {app.path ? (
        <Svg width={size / 2} height={size / 2} viewBox="0 0 24 24">
          <Path d={app.path} fill={app.brand ?? p.ink} />
        </Svg>
      ) : app.name ? (
        <Text className="text-lg font-semibold uppercase text-ink-secondary">
          {app.name.slice(0, 1)}
        </Text>
      ) : (
        <Icon name="apps" size={size / 2} colour={p["ink-muted"]} />
      )}
    </Tile>
  );
}

/** Readwise's R in the room's ink; `bare` drops the tile, for a mark inside a chip. */
export function ReadwiseMark({ size = 40, bare = false }: { size?: number; bare?: boolean }) {
  const p = usePalette();
  const glyph = (
    <Svg
      width={bare ? size : size * 0.6}
      height={bare ? size : size * 0.6}
      viewBox="100 100 300 300"
    >
      <Path d={R} fill={p.ink} />
      <Path d={BLOCK} fill={p.ink} />
      <Path d={COUNTER} fill={p.plate} />
    </Svg>
  );
  return bare ? glyph : <Tile size={size}>{glyph}</Tile>;
}

/** Yomitan's icon is GPL-3.0 artwork with no separate licence, so a dictionary stands in for it. */
export function YomitanMark({ size = 40, bare = false }: { size?: number; bare?: boolean }) {
  const p = usePalette();
  const glyph = (
    <BookA size={bare ? size : size / 2} color={p.ink} strokeWidth={1.75} absoluteStrokeWidth />
  );
  return bare ? glyph : <Tile size={size}>{glyph}</Tile>;
}

/** Custom MCP, which is any app, as a plug. */
export function CustomMark({ size = 40, bare = false }: { size?: number; bare?: boolean }) {
  const p = usePalette();
  const glyph = <Icon name="apps" size={bare ? size : size / 2} colour={p["ink-secondary"]} />;
  return bare ? glyph : <Tile size={size}>{glyph}</Tile>;
}

/** An assistant's glyph alone, in its brand colour, for a chip. */
export function AppGlyph({ app, size = 16 }: { app: AppIdentity; size?: number }) {
  const p = usePalette();
  if (!app.path) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={app.path} fill={app.brand ?? p.ink} />
    </Svg>
  );
}

/** A connected app Lymi doesn't recognise; red when it gives itself a known app's name. connected-apps.md. */
export function UnverifiedChip({ borrowed }: { borrowed: boolean }) {
  const { t } = useLingui();
  return (
    <Chip size="sm" tone={borrowed ? "danger" : "default"} icon="alert">
      {t`Unverified`}
    </Chip>
  );
}
