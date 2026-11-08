import {
  ColorProfile,
  ColorSpace,
  type IMagickImage
} from "@imagemagick/magick-wasm";
import type { BrowserEngine } from "../../browser-engine/browser-engine";

export function normalizeMagickImage(
  image: IMagickImage,
  engine: BrowserEngine
) {
  const srgb = new ColorProfile(engine.SrgbProfile());
  if (!image.transformColorSpace(srgb)) {
    if (image.colorSpace === ColorSpace.CMYK)
      image.transformColorSpace(new ColorProfile(engine.CmykProfile()), srgb);
    else image.colorSpace = ColorSpace.sRGB;
  }
}
