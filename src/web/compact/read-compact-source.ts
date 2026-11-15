import type { IMagickImage } from "@imagemagick/magick-wasm";
import type { BrowserEngine } from "../browser-engine/browser-engine";
import type { CompactArtOptions, CompactLayout } from "./compact-types";
import { maxRasterDimensionInPixels } from "../rendering/raster-limits";

export function readCompactSource(
  source: IMagickImage,
  engine: BrowserEngine,
  options: CompactArtOptions
) {
  return source.clone((image) => {
    if (options.quarterTurns) image.rotate(90 * options.quarterTurns);
    const layout = JSON.parse(
      engine.CompactLayout(image.width, image.height, JSON.stringify(options))
    ) as CompactLayout;
    const [cellWidth, cellHeight] = engine.Geometry();
    if (
      Math.max(layout.columns * cellWidth, layout.rows * cellHeight) >
      maxRasterDimensionInPixels
    )
      throw new Error(
        "This output exceeds the browser raster side limit. Choose fewer columns or a shorter crop."
      );
    const rgba = image.getPixels((pixels) =>
      pixels.toByteArray(0, 0, image.width, image.height, "RGBA")
    );
    if (!rgba)
      throw new Error("The mini-art source did not expose RGBA pixels.");
    return { rgba, layout, width: image.width, height: image.height };
  });
}
