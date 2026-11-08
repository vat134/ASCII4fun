import type {
  BrowserEngine,
  WorkerRequest
} from "../../browser-engine/browser-engine";
import type { BrowserImageSource } from "./browser-image-source";
import { loadFonts } from "../../browser-engine/magick-glyph-renderer";
import { rgbToRgba } from "../../rendering/rgb-to-rgba";
import type { AsciiCanvasProjection } from "../../rendering/ascii-preview-result";

export async function renderImageRequest(
  engine: BrowserEngine,
  source: BrowserImageSource,
  data: WorkerRequest
) {
  if (data.type === "load") {
    await source.load(data.bytes);
    self.postMessage({ id: data.id, value: null });
    return;
  }
  const sampled = source.sample(
    data.options.outputWidthInCells,
    data.options.sourcePhotoOpacity > 0,
    data.options.style
  );
  if (sampled.sourcePhotoRgba !== null)
    engine.SetSourcePhoto(
      sampled.sourcePhotoRgba,
      data.options.outputWidthInCells,
      sampled.height
    );
  const result = JSON.parse(
    engine.Convert(
      sampled.rgba,
      data.options.outputWidthInCells,
      sampled.height,
      JSON.stringify(data.options)
    )
  ) as AsciiCanvasProjection;
  await loadFonts(engine.FontNames(result.text));
  const rgb = engine.Rasterize();
  const pixels = rgbToRgba(rgb);
  self.postMessage(
    {
      id: data.id,
      value: {
        ...result,
        pixels,
        widthInPixels: sampled.widthInPixels,
        heightInPixels: sampled.heightInPixels
      }
    },
    { transfer: [pixels.buffer] }
  );
}
