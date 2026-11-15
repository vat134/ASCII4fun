import { Button } from "../ui/base/button";
import { PreviewToolbar } from "../rendering/preview-toolbar";
import { AsciiPreview } from "../rendering/ascii-preview";
import type { CompactDestination } from "./compact-types";
import type { CompactPreviewState } from "./compact-preview-session";
import { CompactBudget } from "./compact-budget";

export function CompactPreview({
  state,
  destination,
  zoom,
  onZoomChange,
  onBrowse,
  onSelect,
  onRetry,
  onClear
}: {
  state: CompactPreviewState;
  destination: CompactDestination | undefined;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onBrowse: () => void;
  onSelect: (file: File) => void;
  onRetry: (() => void) | null;
  onClear: () => void;
}) {
  const result = state.result;
  return (
    <section
      aria-label="Mini art preview"
      aria-busy={state.status === "pending"}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onSelect(file);
      }}
      className="flex min-h-96 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card lg:h-full"
    >
      <PreviewToolbar
        zoom={zoom}
        onZoomChange={onZoomChange}
        text={state.status === "ready" ? (result?.payload.text ?? null) : null}
        information={destination?.platform ?? ""}
      />
      <div className="flex min-h-72 flex-1 flex-col overflow-hidden">
        {state.error ? (
          <div className="m-auto max-w-sm space-y-4 p-6 text-center text-sm">
            <p role="alert">{state.error}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={onRetry ?? onBrowse}>
                {onRetry ? "Retry" : "Choose image"}
              </Button>
              <Button variant="outline" onClick={onClear}>
                Clear
              </Button>
            </div>
          </div>
        ) : result && destination ? (
          <AsciiPreview result={result} zoom={zoom} maximumBaseScale={0.75} />
        ) : (
          <div className="m-auto max-w-sm space-y-4 p-6 text-center">
            <p className="text-sm">
              {state.status === "pending"
                ? "Making dot art…"
                : "Small artwork. Ready to paste."}
            </p>
            <p className="text-xs text-muted-foreground">
              Choose a still image and a destination to shape your Braille
              artwork.
            </p>
            <Button variant="outline" onClick={onBrowse}>
              Choose image
            </Button>
          </div>
        )}
      </div>
      <div
        className="max-h-36 shrink-0 space-y-2 overflow-y-auto border-t px-4 py-3 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <div className="flex justify-between gap-3 font-mono">
          <span>
            {state.status === "pending"
              ? "Processing"
              : state.status === "ready"
                ? "Ready"
                : state.status === "error"
                  ? "Needs attention"
                  : "Waiting for an image"}
          </span>
          <span>
            {result
              ? `${result.widthInCells} × ${result.heightInCells} cells`
              : "—"}
          </span>
        </div>
        {result && destination && (
          <CompactBudget result={result} destination={destination} />
        )}
        {!result && destination && (
          <p>
            {destination.limit === null
              ? "No text limit"
              : `Limit: ${destination.limit} ${destination.unit}`}
          </p>
        )}
        {result?.payload.warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>
    </section>
  );
}
