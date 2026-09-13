import { Trans, useLingui } from "@lingui/react/macro";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Crop,
  clampCrop,
  cropRect,
  imagePlacement,
  initialCrop,
  MAX_ZOOM,
  MIN_ZOOM,
  panCrop,
} from "../lib/avatar-crop";
import { Button, IconButton } from "./Button";
import { Sheet } from "./Sheet";

/** A decoded image the learner picked, ready to crop. */
export interface PickedImage {
  url: string;
  width: number;
  height: number;
}

interface Props {
  image: PickedImage | null;
  onCancel: () => void;
  /** Resolves when the server has the photo; the sheet stays open until then. */
  onSave: (square: Blob) => Promise<void>;
  saving: boolean;
  error?: string | undefined;
}

/** What is sent: enough pixels for the server's 320 px avatar to be sharp, and no metadata. */
const EXPORT_SIZE = 640;
const KEY_STEP = 12;
const ZOOM_STEP = 0.25;

/**
 * Square crop for the learner's photo. The circle is the result: everything outside it is
 * dimmed, so what the learner lines up is what the menu will show. Drag, pinch or the arrow
 * keys move the photo; the slider, its buttons or plus and minus zoom.
 */
export function AvatarEditor({ image, onCancel, onSave, saving, error }: Props) {
  const { t } = useLingui();
  return (
    <Sheet
      open={image !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onCancel();
      }}
      title={t`Position your photo`}
    >
      {image && (
        <CropStage
          key={image.url}
          image={image}
          onCancel={onCancel}
          onSave={onSave}
          saving={saving}
          error={error}
        />
      )}
    </Sheet>
  );
}

function CropStage({ image, onCancel, onSave, saving, error }: Props & { image: PickedImage }) {
  const { t } = useLingui();
  const hintId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [stage, setStage] = useState(0);
  const [crop, setCrop] = useState<Crop>(() => initialCrop(image.width, image.height));
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const { width, height } = image;
  const coarse = useMemo(() => window.matchMedia("(pointer: coarse)").matches, []);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStage(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const zoomTo = (zoom: number) => setCrop((c) => clampCrop({ ...c, zoom }, width, height));
  const zoomBy = (step: number) =>
    setCrop((c) => clampCrop({ ...c, zoom: c.zoom + step }, width, height));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (saving) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      pinch.current = { distance: spread(pointers.current), zoom: crop.zoom };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last || !stage) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const ratio = spread(pointers.current) / pinch.current.distance;
      zoomTo(pinch.current.zoom * ratio);
      return;
    }
    setCrop((c) => panCrop(c, e.clientX - last.x, e.clientY - last.y, stage, width, height));
  };

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (saving || !stage) return;
    const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setCrop((c) => panCrop(c, move[0], move[1], stage, width, height));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomBy(-ZOOM_STEP);
    }
  };

  const save = async () => {
    const img = imgRef.current;
    if (!img || saving) return;
    const { sx, sy, side } = cropRect(crop, width, height);
    const out = Math.min(EXPORT_SIZE, Math.round(side));
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    canvas.getContext("2d")?.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    // Safari has no WebP encoder and hands back a PNG, which the server takes as well.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.92),
    );
    if (blob) await onSave(blob);
  };

  useEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, []);

  const placement = stage ? imagePlacement(crop, stage, width, height) : null;

  return (
    <div className="grid gap-4">
      <div
        ref={stageRef}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the stage is the control; as an application a screen reader hands it the arrow keys and plus and minus
        tabIndex={0}
        role="application"
        aria-label={t`Photo position`}
        aria-describedby={hintId}
        aria-busy={saving || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
        // Moving the photo inside the phone's drawer must not swipe the drawer away.
        data-vaul-no-drag=""
        className="edge relative mx-auto aspect-square w-full max-w-80 cursor-grab touch-none select-none overflow-hidden rounded-lg bg-plate-2 active:cursor-grabbing"
      >
        <img
          ref={imgRef}
          src={image.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={
            placement
              ? {
                  left: placement.left,
                  top: placement.top,
                  width: placement.width,
                  height: placement.height,
                }
              : { visibility: "hidden" }
          }
        />
        {/* The circle is the avatar; the dimmed corners are what gets cut away. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_100vmax_var(--scrim),inset_0_0_0_1px_var(--edge-2)]"
        />
      </div>

      <p id={hintId} className="text-center text-sm text-muted">
        {coarse ? (
          <Trans>Drag to move the photo. Pinch or use the slider to zoom.</Trans>
        ) : (
          <Trans>Drag or use the arrow keys to move the photo.</Trans>
        )}
      </p>

      <div className="mx-auto flex w-full max-w-80 items-center gap-2">
        <IconButton
          label={t`Zoom out`}
          size="sm"
          onClick={() => zoomBy(-ZOOM_STEP)}
          aria-disabled={saving || crop.zoom <= MIN_ZOOM || undefined}
        >
          <ZoomOut />
        </IconButton>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={crop.zoom}
          disabled={saving}
          onChange={(e) => zoomTo(Number(e.target.value))}
          aria-label={t`Zoom`}
          className="h-11 min-w-0 flex-1 accent-text"
        />
        <IconButton
          label={t`Zoom in`}
          size="sm"
          onClick={() => zoomBy(ZOOM_STEP)}
          aria-disabled={saving || crop.zoom >= MAX_ZOOM || undefined}
        >
          <ZoomIn />
        </IconButton>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} aria-disabled={saving || undefined}>
          <Trans>Cancel</Trans>
        </Button>
        <Button variant="primary" onClick={() => void save()} loading={saving}>
          <Trans>Save photo</Trans>
        </Button>
      </div>
    </div>
  );
}

function spread(points: Map<number, { x: number; y: number }>): number {
  const [a, b] = [...points.values()];
  if (!a || !b) return 1;
  return Math.hypot(a.x - b.x, a.y - b.y) || 1;
}
