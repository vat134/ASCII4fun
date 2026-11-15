import { Button } from "../ui/base/button";
import { ArrowDownToLineIcon } from "../ui/icons";
import { useArtworkDownload } from "../rendering/use-artwork-download";
import type { CompactPreviewResult } from "./compact-types";

export function CompactExport({
  result,
  sourceName
}: {
  result: CompactPreviewResult | null;
  sourceName: string | undefined;
}) {
  const exporter = useArtworkDownload(
    result ? { ...result, text: result.payload.text } : null,
    sourceName
  );
  return (
    <footer className="shrink-0 space-y-4 border-t bg-card p-5">
      {exporter.error && (
        <p role="alert" className="text-xs text-destructive">
          {exporter.error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm">Export</h3>
        <span className="font-mono text-xs text-muted-foreground">
          {result ? `${result.widthInCells} × ${result.heightInCells}` : "—"}
        </span>
      </div>
      {(
        [
          ["png", "Download PNG"],
          ["txt", "Download .txt"]
        ] as const
      ).map(([format, label]) => (
        <Button
          key={format}
          variant={format === "png" ? "default" : "outline"}
          className="h-11 w-full"
          disabled={!result || exporter.busy}
          onClick={() => void exporter.download(format)}
        >
          <ArrowDownToLineIcon aria-hidden="true" />
          {label}
        </Button>
      ))}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        PNG saves the dot grid. TXT and Copy use the destination formatting.
      </p>
    </footer>
  );
}
