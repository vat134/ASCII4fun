import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/base/button";
import { CheckIcon } from "../ui/icons";
import { useRasterPreview } from "../rendering/use-raster-preview";
import type { TextFont } from "./text-conversion";

export function FontCard({
  font,
  selected,
  onChoose,
  onPreview
}: {
  font: TextFont;
  selected: boolean;
  onChoose: () => void;
  onPreview: (id: string) => void;
}) {
  return (
    <Button
      variant="outline"
      aria-pressed={selected}
      onClick={onChoose}
      className="relative flex h-40 w-full flex-col items-stretch gap-3 rounded-xl bg-black p-4 text-white hover:bg-black/90 aria-pressed:border-foreground aria-pressed:ring-1 aria-pressed:ring-foreground"
    >
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <CardRaster key={font.id} font={font} onPreview={onPreview} />
      </div>
      <span className="flex items-center justify-between gap-2 text-left text-xs">
        {font.name}
        {selected && <CheckIcon aria-hidden="true" className="size-3.5" />}
      </span>
    </Button>
  );
}

function CardRaster({
  font,
  onPreview
}: {
  font: TextFont;
  onPreview: (id: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasRaster, setHasRaster] = useState(false);
  if (font.preview && !hasRaster) setHasRaster(true);
  useRasterPreview(font.preview, 100, viewportRef, canvasRef);
  useEffect(() => {
    if (!hasRaster && !font.preview && !font.previewError) onPreview(font.id);
  }, [hasRaster, font.id, font.preview, font.previewError, onPreview]);
  return (
    <div
      ref={viewportRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <canvas ref={canvasRef} hidden={!hasRaster} className="shrink-0" />
      {!hasRaster && (
        <span
          title={font.previewError}
          className="text-xs text-muted-foreground"
        >
          {font.previewError ? "Preview unavailable" : "Loading preview"}
        </span>
      )}
    </div>
  );
}
