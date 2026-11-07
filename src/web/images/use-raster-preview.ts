import { useLayoutEffect, useRef, type RefObject } from "react";
import type { ImageConversionResult } from "./image-conversion";

export function useRasterPreview(
  result: ImageConversionResult,
  zoom: number,
  viewportRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>
) {
  const sourceRef = useRef<OffscreenCanvas | null>(null);

  useLayoutEffect(() => {
    const source = new OffscreenCanvas(
      result.widthInPixels,
      result.heightInPixels
    );
    const context = source.getContext("2d");
    if (!context)
      throw new Error("The browser could not create the preview canvas.");
    context.putImageData(
      new ImageData(result.pixels, source.width, source.height),
      0,
      0
    );
    sourceRef.current = source;
    return () => {
      sourceRef.current = null;
      source.width = source.height = 1;
    };
  }, [result]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!viewport || !canvas || !source) return;

    const paint = () => {
      if (!viewport.clientWidth || !viewport.clientHeight) return;
      const scale =
        (Math.min(
          viewport.clientWidth / source.width,
          viewport.clientHeight / source.height
        ) *
          zoom) /
        100;
      // Filter at display resolution; zoom never allocates more pixels than the original raster.
      const pixelScale = Math.min(scale * window.devicePixelRatio, 1);
      canvas.style.width = `${Math.max(1, Math.round(source.width * scale))}px`;
      canvas.style.height = `${Math.max(1, Math.round(source.height * scale))}px`;
      canvas.width = Math.max(1, Math.round(source.width * pixelScale));
      canvas.height = Math.max(1, Math.round(source.height * pixelScale));
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("The browser could not draw the preview canvas.");
      context.imageSmoothingQuality = "high";
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
    };

    paint();
    let resizeFrame = 0;
    // Canvas sizing can change scrollbars; finish observer delivery before updating layout.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(paint);
    });
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
    };
  }, [result, zoom, viewportRef, canvasRef]);
}
