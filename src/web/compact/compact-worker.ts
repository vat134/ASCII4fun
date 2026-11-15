import type { BrowserEngine } from "../browser-engine/browser-engine";
import { BrowserImageSource } from "../images/worker/browser-image-source";
import { loadFonts } from "../browser-engine/magick-glyph-renderer";
import { rgbToRgba } from "../rendering/rgb-to-rgba";
import type { CompactPreviewResult, CompactRequest } from "./compact-types";

let cachedLooks: { key: string; text: Record<string, string> } | null = null;

export async function renderCompactRequest(
  engine: BrowserEngine,
  source: BrowserImageSource,
  data: CompactRequest
) {
  if (data.type === "load-compact") {
    cachedLooks = null;
    engine.ValidateCompactSource(data.bytes);
    await source.load(data.bytes);
    self.postMessage({ id: data.id, value: null });
    return;
  }
  const sampled = source.compact(data.options);
  const convert = (options: typeof data.options) =>
    engine.ConvertCompact(
      sampled.rgba,
      sampled.width,
      sampled.height,
      JSON.stringify(options)
    );
  const result = JSON.parse(convert(data.options)) as Omit<
    CompactPreviewResult,
    "pixels" | "widthInPixels" | "heightInPixels"
  >;
  await loadFonts(engine.FontNames(result.text));
  const pixels = rgbToRgba(engine.Rasterize());
  const [cellWidth, cellHeight] = engine.Geometry();
  const key = JSON.stringify({ ...data.options, look: null });
  if (cachedLooks?.key !== key) {
    const text: Record<string, string> = { [data.options.look]: result.text };
    for (const look of ["photo", "texture", "sketch", "soft", "poster"]) {
      if (look === data.options.look) continue;
      text[look] = (
        JSON.parse(convert({ ...data.options, look })) as { text: string }
      ).text;
    }
    cachedLooks = { key, text };
  }
  self.postMessage(
    {
      id: data.id,
      value: {
        ...result,
        lookPreviews: cachedLooks.text,
        pixels,
        widthInPixels: result.widthInCells * cellWidth,
        heightInPixels: result.heightInCells * cellHeight
      }
    },
    { transfer: [pixels.buffer] }
  );
}
