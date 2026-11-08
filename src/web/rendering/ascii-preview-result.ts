/** Shared character canvas raster, independent of its image or text source. */
export type AsciiPreviewResult = {
  text: string;
  widthInCells: number;
  heightInCells: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
  widthInPixels: number;
  heightInPixels: number;
};
