import { useState } from "react";
import { AsciiSpinner } from "../ui/ascii-spinner";
import { Button } from "../ui/base/button";
import { AsciiPreview } from "./ascii-preview";
import { ImageUploadPrompt } from "./image-upload-prompt";
import type { ConversionState } from "./use-image-conversion";

type ImagePreviewStageProps = {
  state: ConversionState;
  zoom: number;
  characterCellAspectRatio: number;
  maxEncodedBytes: number;
  hasImage: boolean;
  onBrowse: () => void;
  onSelect: (file: File) => void;
  onRetry: () => void;
};

export function ImagePreviewStage({
  state,
  zoom,
  characterCellAspectRatio,
  maxEncodedBytes,
  hasImage,
  onBrowse,
  onSelect,
  onRetry
}: ImagePreviewStageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const result = "result" in state ? state.result : null;
  return (
    <div
      className={`relative flex h-96 min-h-64 items-center justify-center overflow-hidden bg-background transition-colors sm:h-128 lg:h-auto lg:min-h-0 lg:flex-1 ${isDragging ? "ring-2 ring-inset ring-foreground" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onSelect(file);
      }}
    >
      {result ? (
        <div
          className={`size-full p-5 transition-opacity ${state.status === "pending" ? "opacity-40" : "opacity-100"}`}
        >
          <AsciiPreview
            result={result}
            characterCellAspectRatio={characterCellAspectRatio}
            zoom={zoom}
          />
        </div>
      ) : state.status === "empty" ? (
        <ImageUploadPrompt
          maxEncodedBytes={maxEncodedBytes}
          onBrowse={onBrowse}
        />
      ) : null}

      {state.status === "pending" && (
        <div
          role="status"
          className="absolute rounded-lg border bg-card px-5 py-3 text-sm shadow-lg"
        >
          <span className="flex items-center gap-3">
            <AsciiSpinner /> Converting image
          </span>
        </div>
      )}
      {state.status === "error" && (
        <div className="absolute max-w-sm space-y-4 rounded-xl border bg-card p-6 text-center">
          <p role="alert" className="text-sm leading-relaxed">
            {state.message}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" className="h-10" onClick={onBrowse}>
              Choose image
            </Button>
            {hasImage && (
              <Button className="h-10" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
