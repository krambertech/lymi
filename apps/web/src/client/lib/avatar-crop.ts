/**
 * A square crop over an image, in the image's own pixels. `x` and `y` are the crop's centre;
 * the side is the image's short side divided by `zoom`, so zoom 1 is the largest square that fits.
 */
export interface Crop {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export function initialCrop(width: number, height: number): Crop {
  return { x: width / 2, y: height / 2, zoom: MIN_ZOOM };
}

export function cropSide(width: number, height: number, zoom: number): number {
  return Math.min(width, height) / zoom;
}

/** Keeps the square inside the image, whatever the zoom or position asked for. */
export function clampCrop(crop: Crop, width: number, height: number): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom));
  const half = cropSide(width, height, zoom) / 2;
  return {
    zoom,
    x: Math.min(width - half, Math.max(half, crop.x)),
    y: Math.min(height - half, Math.max(half, crop.y)),
  };
}

/** Moves the crop by a distance on screen, where the stage is `stage` pixels wide. */
export function panCrop(
  crop: Crop,
  dx: number,
  dy: number,
  stage: number,
  width: number,
  height: number,
): Crop {
  const scale = stage / cropSide(width, height, crop.zoom);
  return clampCrop({ ...crop, x: crop.x - dx / scale, y: crop.y - dy / scale }, width, height);
}

/** Where the whole image sits on a stage `stage` pixels wide, as CSS pixels. */
export function imagePlacement(crop: Crop, stage: number, width: number, height: number) {
  const scale = stage / cropSide(width, height, crop.zoom);
  return {
    left: stage / 2 - crop.x * scale,
    top: stage / 2 - crop.y * scale,
    width: width * scale,
    height: height * scale,
  };
}

/** The source rectangle to draw for `crop`. */
export function cropRect(crop: Crop, width: number, height: number) {
  const side = cropSide(width, height, crop.zoom);
  return { sx: crop.x - side / 2, sy: crop.y - side / 2, side };
}
