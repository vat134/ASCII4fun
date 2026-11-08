import type { BrowserEngine } from "../../browser-engine/browser-engine";
import { loadFonts } from "../../browser-engine/magick-glyph-renderer";
import { rgbToRgba } from "../../rendering/rgb-to-rgba";
import { maxRasterDimensionInPixels } from "../../rendering/raster-limits";
import type {
  AsciiCanvasProjection,
  AsciiPreviewResult
} from "../../rendering/ascii-preview-result";
import {
  fontSampleText,
  defaultTextColor,
  type TextFont,
  type FontColorReplacements,
  type TextRequest
} from "../text-conversion";

export async function renderTextRequest(
  engine: BrowserEngine,
  data: TextRequest
) {
  const [cellWidth, cellHeight] = engine.Geometry();
  async function render(
    text: string,
    fontId: string,
    foregroundColor: string,
    colorReplacements: FontColorReplacements = {}
  ): Promise<AsciiPreviewResult> {
    const result = JSON.parse(
      engine.ConvertText(
        text,
        fontId,
        foregroundColor,
        JSON.stringify(colorReplacements)
      )
    ) as AsciiCanvasProjection;
    const widthInPixels = result.widthInCells * cellWidth;
    const heightInPixels = result.heightInCells * cellHeight;
    if (Math.max(widthInPixels, heightInPixels) > maxRasterDimensionInPixels)
      throw new Error(
        "This text exceeds the browser raster side limit. Add a line break or choose a smaller font."
      );
    await loadFonts(engine.FontNames(result.text));
    return {
      ...result,
      pixels: rgbToRgba(engine.Rasterize()),
      widthInPixels,
      heightInPixels
    };
  }
  if (data.type === "fonts") {
    const metadata = JSON.parse(engine.TextFonts()) as Omit<
      TextFont,
      "preview"
    >[];
    self.postMessage({
      id: data.id,
      value: metadata.map((font) => ({ ...font, preview: null }))
    });
  } else if (data.type === "font-palette") {
    self.postMessage({
      id: data.id,
      value: JSON.parse(engine.TextFontPalette(data.fontId))
    });
  } else {
    const nativeColors =
      data.type === "font-preview" &&
      (JSON.parse(engine.TextFonts()) as TextFont[]).some(
        (font) => font.id === data.fontId && font.hasNativeColors
      );
    const result =
      data.type === "font-preview"
        ? thumbnail(
            await render(
              fontSampleText,
              data.fontId,
              nativeColors ? "" : defaultTextColor
            )
          )
        : await render(
            data.text,
            data.fontId,
            data.foregroundColor,
            data.colorReplacements
          );
    self.postMessage(
      { id: data.id, value: result },
      { transfer: [result.pixels.buffer] }
    );
  }
}

function thumbnail(result: AsciiPreviewResult): AsciiPreviewResult {
  // Cards retain display-sized pixels; the active text preview keeps the full raster.
  const scale = Math.min(
    1,
    384 / result.widthInPixels,
    160 / result.heightInPixels
  );
  if (scale === 1) return result;
  const source = new OffscreenCanvas(
    result.widthInPixels,
    result.heightInPixels
  );
  const target = new OffscreenCanvas(
    Math.max(1, Math.round(result.widthInPixels * scale)),
    Math.max(1, Math.round(result.heightInPixels * scale))
  );
  try {
    const sourceContext = source.getContext("2d");
    const targetContext = target.getContext("2d");
    if (!sourceContext || !targetContext)
      throw new Error("The browser could not draw font previews.");
    sourceContext.putImageData(
      new ImageData(result.pixels, source.width, source.height),
      0,
      0
    );
    targetContext.imageSmoothingQuality = "high";
    targetContext.drawImage(source, 0, 0, target.width, target.height);
    return {
      ...result,
      pixels: targetContext.getImageData(0, 0, target.width, target.height)
        .data,
      widthInPixels: target.width,
      heightInPixels: target.height
    };
  } finally {
    source.width = source.height = target.width = target.height = 1;
  }
}
