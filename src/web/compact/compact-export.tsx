import { ArtworkExport } from "../rendering/artwork-export";
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
    <ArtworkExport
      canExport={result !== null && !exporter.busy}
      error={exporter.error}
      dimensions={
        result ? `${result.widthInCells} × ${result.heightInCells}` : "—"
      }
      onExport={exporter.download}
    >
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        PNG saves the dot grid. TXT and Copy use the destination formatting.
      </p>
    </ArtworkExport>
  );
}
