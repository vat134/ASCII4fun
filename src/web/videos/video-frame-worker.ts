import {
  ImageMagick,
  ColorSpace,
  MagickFormat,
  MagickReadSettings
} from "@imagemagick/magick-wasm";
import type {
  BrowserEngine,
  WorkerRequest
} from "../browser-engine/browser-engine";
import { sampleRgbaImage } from "../images/worker/sample-rgba-image";
import { loadFonts } from "../browser-engine/magick-glyph-renderer";
import { rgbToRgba } from "../rendering/rgb-to-rgba";
import type { AsciiCanvasProjection } from "../rendering/ascii-preview-result";
import { maxRasterDimensionInPixels } from "../rendering/raster-limits";

export async function renderVideoFrame(
  engine: BrowserEngine,
  data: Extract<WorkerRequest, { type: "video-frame" }>
) {
  if (
    data.width < 1 ||
    data.height < 1 ||
    data.width * data.height > 1920 * 1080 ||
    data.bytes.length !== data.width * data.height * 4
  )
    throw new Error("Invalid video frame dimensions.");
  const columns = data.options.outputWidthInCells;
  const height = engine.Height(data.width, data.height, columns);
  const [cellWidth, cellHeight] = engine.Geometry();
  const widthInPixels = columns * cellWidth,
    heightInPixels = height * cellHeight;
  engine.PhotoByteLength(columns, height);
  if (Math.max(widthInPixels, heightInPixels) > maxRasterDimensionInPixels)
    throw new Error(
      "This video output exceeds the browser raster side limit. Choose fewer columns."
    );
  const sampled = ImageMagick.read(
    data.bytes,
    new MagickReadSettings({
      format: MagickFormat.Rgba,
      width: data.width,
      height: data.height,
      depth: 8
    }),
    (image) => {
      image.colorSpace = ColorSpace.sRGB;
      return {
        rgba: sampleRgbaImage(image, columns, height),
        photo:
          data.options.sourcePhotoOpacity > 0
            ? sampleRgbaImage(image, widthInPixels, heightInPixels)
            : new Uint8Array()
      };
    }
  );
  engine.SetAnimationRange(0, 1);
  engine.SetSourcePhoto(sampled.photo, columns, height);
  const result = JSON.parse(
    engine.Convert(sampled.rgba, columns, height, JSON.stringify(data.options))
  ) as AsciiCanvasProjection;
  await loadFonts(engine.FontNames(result.text));
  const pixels = rgbToRgba(engine.Rasterize());
  self.postMessage(
    {
      id: data.id,
      value: { ...result, pixels, widthInPixels, heightInPixels }
    },
    { transfer: [pixels.buffer] }
  );
}
