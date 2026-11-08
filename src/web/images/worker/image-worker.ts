import type {
  BrowserEngine,
  WorkerRequest
} from "../../browser-engine/browser-engine";
import type { BrowserMediaSource } from "./browser-media-source";
import { loadFonts } from "../../browser-engine/magick-glyph-renderer";
import { rgbToRgba } from "../../rendering/rgb-to-rgba";
import type { AsciiCanvasProjection } from "../../rendering/ascii-preview-result";

export async function renderImageRequest(
  engine: BrowserEngine,
  source: BrowserMediaSource,
  data: Extract<WorkerRequest, { type: "load" | "convert" }>
) {
  if (data.type === "load") {
    const metadata = await source.load(data.bytes);
    self.postMessage({ id: data.id, value: metadata });
    return;
  }
  const animation = source.animation(data.frameIndex ?? 0, data.playback);
  const sampled = source.sample(
    data.options,
    animation ? animation.timeline[animation.frameIndex]!.sourceFrameIndex : 0
  );
  if (sampled.sourcePhotoRgba !== null)
    engine.SetSourcePhoto(
      sampled.sourcePhotoRgba,
      data.options.outputWidthInCells,
      sampled.height
    );
  if (data.options.useMeasuredGlyphDensity)
    await loadFonts(engine.FontNames(data.options.characterRamp));
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
        animation,
        pixels,
        widthInPixels: sampled.widthInPixels,
        heightInPixels: sampled.heightInPixels
      }
    },
    { transfer: [pixels.buffer] }
  );
}
