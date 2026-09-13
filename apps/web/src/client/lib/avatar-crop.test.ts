import { describe, expect, it } from "vitest";
import { clampCrop, cropRect, imagePlacement, initialCrop, panCrop } from "./avatar-crop";

describe("avatar crop", () => {
  it("starts on the largest centred square", () => {
    const crop = initialCrop(1200, 800);
    expect(cropRect(crop, 1200, 800)).toEqual({ sx: 200, sy: 0, side: 800 });
  });

  it("never lets the square leave the image", () => {
    expect(clampCrop({ x: -50, y: 9999, zoom: 1 }, 1200, 800)).toEqual({ x: 400, y: 400, zoom: 1 });
    expect(clampCrop({ x: 600, y: 400, zoom: 10 }, 1200, 800).zoom).toBe(4);
    expect(clampCrop({ x: 600, y: 400, zoom: 0.2 }, 1200, 800).zoom).toBe(1);
  });

  it("moves the image with the pointer, at the stage's scale", () => {
    const crop = { x: 600, y: 400, zoom: 2 };
    // The stage shows 400 image pixels across 200 screen pixels, so one screen pixel is two.
    expect(panCrop(crop, 10, -5, 200, 1200, 800)).toEqual({ x: 580, y: 410, zoom: 2 });
  });

  it("places the image so the crop fills the stage", () => {
    const placement = imagePlacement({ x: 600, y: 400, zoom: 1 }, 320, 1200, 800);
    expect(placement).toEqual({ left: -80, top: 0, width: 480, height: 320 });
  });
});
