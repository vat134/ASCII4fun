import { AsciiPreview } from "../rendering/ascii-preview";
import { AsciiSpinner } from "../ui/ascii-spinner";
import { Button } from "../ui/base/button";
import type { TextPreviewState } from "./text-conversion";
import { PreviewToolbar } from "../rendering/preview-toolbar";

const textPreviewFitScale = 0.5;

export function TextPreview({
  state,
  fontName,
  zoom,
  onZoomChange,
  onRetry
}: {
  state: TextPreviewState;
  fontName: string;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onRetry: () => void;
}) {
  return (
    <section
      aria-label="Text preview"
      className="flex h-96 shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:h-1/2 lg:min-h-0"
    >
      <PreviewToolbar
        information={fontName}
        zoom={zoom}
        onZoomChange={onZoomChange}
        text={state.status === "ready" ? state.result.text : null}
      />
      <div
        className="flex min-h-0 flex-1 items-center justify-center bg-black p-5 text-white"
        aria-busy={state.status === "pending"}
      >
        {state.status === "ready" ? (
          <AsciiPreview
            result={state.result}
            zoom={zoom * textPreviewFitScale}
          />
        ) : state.status === "error" ? (
          <div className="max-w-sm space-y-4 text-center">
            <p role="alert" className="text-sm">
              {state.message}
            </p>
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : (
          <p
            role="status"
            className="flex items-center gap-3 text-sm text-muted-foreground"
          >
            {state.status === "pending" ? (
              <>
                <AsciiSpinner /> Rendering text
              </>
            ) : (
              "Enter text to see your artwork"
            )}
          </p>
        )}
      </div>
      <footer className="shrink-0 border-t px-5 pb-3 font-mono text-xs text-muted-foreground">
        <div
          className="flex min-h-11 items-center justify-between gap-3"
          aria-live="polite"
        >
          <span>
            {state.status === "ready"
              ? "Ready"
              : state.status === "pending"
                ? "Rendering"
                : state.status === "error"
                  ? "Needs attention"
                  : "Waiting for text"}
          </span>
          <span>
            {state.status === "ready"
              ? `${state.result.widthInCells} × ${state.result.heightInCells} cells`
              : "—"}
          </span>
        </div>
        <p>
          Size is columns × rows and depends on your text. When pasting, use a
          monospace font and enough width to avoid wrapping. Chat fonts can
          change alignment.
        </p>
      </footer>
    </section>
  );
}
