import { useLayoutEffect, useRef, type PointerEvent } from "react";
import type { ImageConversionResult } from "./image-conversion";

type AsciiPreviewProps = {
  result: ImageConversionResult;
  zoom: number;
};

export function AsciiPreview({ result, zoom }: AsciiPreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
  }, [zoom]);

  function endPan(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  return (
    <div
      ref={viewportRef}
      role="region"
      aria-label="ASCII preview viewport"
      tabIndex={0}
      className={`flex size-full overflow-auto select-none outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground ${zoom > 100 ? "cursor-grab active:cursor-grabbing" : ""}`}
      onPointerDown={(event) => {
        const viewport = event.currentTarget;
        if (event.button !== 0 || event.pointerType !== "mouse") return;
        if (
          viewport.scrollWidth <= viewport.clientWidth &&
          viewport.scrollHeight <= viewport.clientHeight
        )
          return;
        event.preventDefault();
        viewport.focus({ preventScroll: true });
        drag.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          left: viewport.scrollLeft,
          top: viewport.scrollTop
        };
        viewport.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const origin = drag.current;
        if (!origin || origin.pointerId !== event.pointerId) return;
        event.currentTarget.scrollLeft = origin.left + origin.x - event.clientX;
        event.currentTarget.scrollTop = origin.top + origin.y - event.clientY;
      }}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onLostPointerCapture={endPan}
    >
      <img
        alt={`ASCII preview, ${result.widthInCells} columns by ${result.heightInCells} rows`}
        src={`data:image/png;base64,${result.png}`}
        draggable={false}
        className="m-auto max-w-none shrink-0 object-contain"
        style={{ width: `${zoom}%`, height: `${zoom}%` }}
      />
    </div>
  );
}
