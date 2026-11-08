import { Button } from "../ui/base/button";
import { ArrowDownToLineIcon } from "../ui/icons";
import type { useAnimationDownload } from "./use-animation-download";

export function AnimationExport({
  exporter,
  canExport,
  canExportGif,
  onPng,
  onTxt,
  frameBusy,
  frameError,
  format
}: {
  exporter: ReturnType<typeof useAnimationDownload>;
  canExport: boolean;
  canExportGif: boolean;
  onPng: () => void;
  onTxt: () => void;
  frameBusy: boolean;
  frameError: string | null;
  format: "gif" | "mp4";
}) {
  return (
    <footer className="shrink-0 space-y-3 border-t bg-card p-5">
      <h3 className="text-sm">Export animation</h3>
      {(exporter.error || frameError) && (
        <p role="alert" className="text-xs text-destructive">
          {exporter.error ?? frameError}
        </p>
      )}
      <Button
        className="h-11 w-full"
        disabled={!canExportGif || exporter.busy}
        onClick={() => void exporter.download()}
      >
        <ArrowDownToLineIcon aria-hidden="true" /> Download{" "}
        {format.toUpperCase()}
      </Button>
      <Button
        variant="outline"
        className="h-11 w-full"
        disabled={!canExport || frameBusy}
        onClick={onPng}
      >
        <ArrowDownToLineIcon aria-hidden="true" /> PNG current frame
      </Button>
      <Button
        variant="outline"
        className="h-11 w-full"
        disabled={!canExport || frameBusy}
        onClick={onTxt}
      >
        <ArrowDownToLineIcon aria-hidden="true" /> TXT current frame
      </Button>
      {exporter.busy && (
        <div className="space-y-2">
          <p role="status" className="font-mono text-xs">
            {exporter.completedFrames
              ? `${exporter.completedFrames} frames rendered · preparing ${format.toUpperCase()}`
              : `Preparing ${format.toUpperCase()}`}
          </p>
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={exporter.cancel}
          >
            Cancel export
          </Button>
        </div>
      )}
      <p className="font-mono text-xs text-muted-foreground">
        {format === "mp4" ? "MP4 retains source sound and uses" : "GIF uses"}{" "}
        the selected speed and FPS. PNG, TXT and Copy text capture the displayed
        frame when clicked.
      </p>
    </footer>
  );
}
