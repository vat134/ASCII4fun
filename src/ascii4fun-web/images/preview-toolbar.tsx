import { Button } from "../ui/base/button";
import { XIcon, ZoomInIcon, ZoomOutIcon } from "../ui/icons";
import { previewZoom } from "./preview-zoom";

type PreviewToolbarProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  hasImage: boolean;
  onClear: () => void;
};

export function PreviewToolbar({
  zoom,
  onZoomChange,
  hasImage,
  onClear
}: PreviewToolbarProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-5">
      <h2 className="text-sm">Preview</h2>
      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Preview zoom"
          className="flex items-center"
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
        {hasImage && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove image"
            onClick={onClear}
          >
            <XIcon aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
