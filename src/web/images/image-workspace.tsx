import { useArtworkDownload } from "../rendering/use-artwork-download";
import { useRef, useState } from "react";
import {
  createDefaultImageOptions,
  type ImageConfiguration
} from "./image-conversion";
import { ImagePreviewStage } from "./image-preview-stage";
import { ImageSettings } from "./image-settings";
import { ImageSource } from "./image-source";
import { PreviewToolbar } from "../rendering/preview-toolbar";
import { previewZoom } from "../rendering/preview-zoom";
import { useImageConversion } from "./use-image-conversion";

export function ImageWorkspace({
  configuration,
  onTextMode
}: {
  configuration: ImageConfiguration;
  onTextMode: () => void;
}) {
  const {
    selection,
    options,
    state,
    selectImage,
    changeOptions,
    clear,
    retry
  } = useImageConversion(configuration);
  const inputRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(previewZoom.default);
  const result = "result" in state ? state.result : null;
  const dimensions = result
    ? `${result.widthInCells} × ${result.heightInCells}`
    : "—";

  const {
    download,
    busy: exporting,
    error: exportError
  } = useArtworkDownload(
    state.status === "ready" ? state.result : null,
    selection?.file.name
  );

  return (
    <main className="mx-auto flex w-full max-w-480 flex-1 flex-col gap-4 p-4 sm:p-6 lg:min-h-0 lg:flex-row lg:gap-5 lg:p-6 xl:p-8">
      <input
        ref={inputRef}
        id="image-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Upload image"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) selectImage(file);
          event.currentTarget.value = "";
        }}
      />

      <ImageSource
        onTextMode={onTextMode}
        selection={selection}
        onBrowse={() => inputRef.current?.click()}
      />

      <section
        aria-label="Preview workspace"
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card lg:h-full"
      >
        <PreviewToolbar
          zoom={zoom}
          onZoomChange={setZoom}
          text={state.status === "ready" ? state.result.text : null}
          onClear={selection ? clear : undefined}
        />

        <ImagePreviewStage
          state={state}
          zoom={zoom}
          maxEncodedBytes={configuration.maxEncodedBytes}
          hasImage={selection !== null}
          onBrowse={() => inputRef.current?.click()}
          onSelect={selectImage}
          onRetry={retry}
          onClear={clear}
        />

        <div
          className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-t px-4 font-mono text-xs text-muted-foreground sm:px-5"
          aria-live="polite"
        >
          <span>
            {state.status === "ready"
              ? "Ready"
              : state.status === "pending"
                ? "Processing"
                : state.status === "error"
                  ? "Needs attention"
                  : "Waiting for an image"}
          </span>
          <span>
            {dimensions}
            {result ? " cells" : ""}
          </span>
        </div>
      </section>

      <ImageSettings
        configuration={configuration}
        options={options}
        onChange={changeOptions}
        onReset={() => {
          setZoom(previewZoom.default);
          changeOptions(createDefaultImageOptions(configuration));
        }}
        canExport={state.status === "ready" && !exporting}
        exportError={exportError}
        onExport={download}
        dimensions={dimensions}
      />
    </main>
  );
}
