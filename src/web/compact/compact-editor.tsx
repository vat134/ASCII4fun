import { useRef, useState } from "react";
import type { WorkspaceMode } from "../workspace/ascii-type";
import { previewZoom } from "../rendering/preview-zoom";
import type { CompactConfiguration } from "./compact-types";
import { useCompactConversion } from "./use-compact-conversion";
import { CompactSource } from "./compact-source";
import { CompactPreview } from "./compact-preview";
import { CompactSettings } from "./compact-settings";
import { CompactExport } from "./compact-export";

export function CompactEditor({
  configuration,
  maxEncodedBytes,
  active,
  onModeChange
}: {
  configuration: CompactConfiguration;
  maxEncodedBytes: number;
  active: boolean;
  onModeChange: (mode: WorkspaceMode) => void;
}) {
  const conversion = useCompactConversion(
    configuration.defaultOptions,
    maxEncodedBytes,
    active
  );
  const [zoom, setZoom] = useState(previewZoom.default);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const { state, options, file } = conversion;
  const destination = configuration.destinations.find(
    (item) => item.id === options.destination
  );
  return (
    <main className="mx-auto flex w-full max-w-480 flex-1 flex-col gap-4 p-4 sm:p-6 lg:min-h-0 lg:flex-row lg:gap-5 lg:p-6 xl:p-8">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload mini art image"
        className="sr-only"
        onChange={(event) => {
          const next = event.currentTarget.files?.[0];
          if (next) conversion.selectFile(next);
          event.currentTarget.value = "";
        }}
      />
      <CompactSource
        file={file}
        sourceUrl={conversion.sourceUrl}
        onBrowse={() => input.current?.click()}
        onClear={conversion.clear}
        onModeChange={onModeChange}
      />
      <CompactPreview
        state={state}
        destination={destination}
        zoom={zoom}
        onZoomChange={setZoom}
        onBrowse={() => input.current?.click()}
        onSelect={conversion.selectFile}
        onRetry={file ? conversion.retry : null}
        onClear={conversion.clear}
      />
      <CompactSettings
        key={settingsRevision}
        options={options}
        destinations={configuration.destinations}
        result={state.result}
        onChange={conversion.changeOptions}
        onReset={() => {
          setZoom(previewZoom.default);
          setSettingsRevision((value) => value + 1);
          conversion.changeOptions(configuration.defaultOptions);
        }}
        exportPanel={
          <CompactExport
            result={state.status === "ready" ? state.result : null}
            sourceName={file?.name}
          />
        }
      />
    </main>
  );
}
