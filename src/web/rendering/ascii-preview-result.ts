/** Glyph-only C# canvas projection before rasterization. */
export type AsciiCanvasProjection = {
  text: string;
  widthInCells: number;
  heightInCells: number;
};

/** Shared character canvas raster, independent of its image or text source. */
export type AsciiPreviewResult = AsciiCanvasProjection & {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  widthInPixels: number;
  heightInPixels: number;
};
