import type { AsciiPreviewResult } from "./ascii-preview-result";

export async function exportPreviewPng(
  result: AsciiPreviewResult
): Promise<Blob> {
  const canvas = new OffscreenCanvas(
    result.widthInPixels,
    result.heightInPixels
  );
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot export a canvas image.");
  context.putImageData(
    new ImageData(result.pixels, result.widthInPixels, result.heightInPixels),
    0,
    0
  );
  return canvas.convertToBlob({ type: "image/png" });
}
