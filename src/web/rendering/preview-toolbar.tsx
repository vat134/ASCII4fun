import { Button } from "../ui/base/button";
import { ZoomInIcon, ZoomOutIcon } from "../ui/icons";
import { previewZoom } from "./preview-zoom";
import { CopyTextButton } from "./copy-text-button";

type PreviewToolbarProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  information?: string;
  text: string | null;
};

export function PreviewToolbar({
  zoom,
  onZoomChange,
  information,
  text
}: PreviewToolbarProps) {
  return (
    <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 border-b px-4 sm:flex sm:px-5">
      <div className="flex min-h-14 shrink-0 items-center gap-2">
        <h2 className="text-sm">Preview</h2>
      </div>
      {information && (
        <span
          className="min-w-0 truncate text-right text-xs text-muted-foreground sm:flex-1"
          title={information}
        >
          {information}
        </span>
      )}
      <div className="col-span-2 flex min-w-0 items-center justify-end gap-2 sm:ml-auto">
        <div
          role="group"
          aria-label="Preview zoom"
          className="flex shrink-0 items-center"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom out"
            disabled={zoom === previewZoom.min}
            onClick={() =>
              onZoomChange(Math.max(previewZoom.min, zoom - previewZoom.step))
            }
          >
            <ZoomOutIcon aria-hidden="true" />
          </Button>
          <output
            aria-label="Preview zoom level"
            className="w-12 text-center font-mono text-xs"
          >
            {zoom}%
          </output>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zoom in"
            disabled={zoom === previewZoom.max}
            onClick={() =>
              onZoomChange(Math.min(previewZoom.max, zoom + previewZoom.step))
            }
          >
            <ZoomInIcon aria-hidden="true" />
          </Button>
        </div>
        <CopyTextButton text={text} />
      </div>
    </div>
  );
}
