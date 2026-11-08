import { useEffect, useRef } from "react";
import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";
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
  useEffect(() => {
    if (!font.preview && !font.previewError) onPreview(font.id);
  }, [font.id, font.preview, font.previewError, onPreview]);
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
        {font.preview ? (
          <CardRaster result={font.preview} />
        ) : (
          <span
            title={font.previewError}
            className="text-xs text-muted-foreground"
          >
            {font.previewError ? "Preview unavailable" : "Loading preview"}
          </span>
        )}
      </div>
      <span className="flex items-center justify-between gap-2 text-left text-xs">
        {font.name}
        {selected && <CheckIcon aria-hidden="true" className="size-3.5" />}
      </span>
    </Button>
  );
}

function CardRaster({ result }: { result: AsciiPreviewResult }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useRasterPreview(result, 100, viewportRef, canvasRef);
  return (
    <div
      ref={viewportRef}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        width={result.widthInPixels}
        height={result.heightInPixels}
        className="shrink-0"
      />
    </div>
  );
}
