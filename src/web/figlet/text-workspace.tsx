import { useArtworkDownload } from "../rendering/use-artwork-download";
import { useState } from "react";
import { previewZoom } from "../rendering/preview-zoom";
import { AsciiType } from "../workspace/ascii-type";
import { FontGallery } from "./font-gallery";
import { TextPreview } from "./text-preview";
import { useTextConversion } from "./use-text-conversion";
import { TextSettings } from "./text-settings";

export function TextWorkspace({
  active,
  onMediaMode
}: {
  active: boolean;
  onMediaMode: () => void;
}) {
  const {
    text,
    fontId,
    fonts,
    state,
    foregroundColor,
    changeText,
    chooseFont,
    changeColor,
    retry,
    colorReplacements,
    changeFontColor,
    resetColors,
    requestThumbnail
  } = useTextConversion(active);
  const [zoom, setZoom] = useState(previewZoom.default);
  const selectedFont = fonts.find((font) => font.id === fontId);
  const fontName = selectedFont?.name ?? "";
  const result = state.status === "ready" ? state.result : null;
  const { download, busy, error } = useArtworkDownload(result, "ascii-text");
  return (
    <main className="mx-auto flex w-full max-w-480 flex-1 flex-col gap-4 p-4 sm:p-6 lg:min-h-0 lg:flex-row lg:gap-5 lg:p-6 xl:p-8">
      <aside
        aria-label="Text source"
        className="shrink-0 lg:w-48 xl:w-52 2xl:w-56"
      >
        <AsciiType mode="text" onChange={onMediaMode}>
          <label
            htmlFor="figlet-text"
            className="block font-mono text-xs text-muted-foreground uppercase"
          >
            Text
          </label>
          <textarea
            id="figlet-text"
            value={text}
            onChange={(event) => changeText(event.currentTarget.value)}
            placeholder="Type your text"
            className="min-h-40 w-full resize-y rounded-lg border bg-background p-3 font-mono text-sm leading-relaxed outline-none focus-visible:ring-1 focus-visible:ring-foreground"
          />
        </AsciiType>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:gap-5">
        <TextPreview
          state={state}
          fontName={fontName}
          zoom={zoom}
          onZoomChange={setZoom}
          onRetry={retry}
        />
        <FontGallery
          fonts={fonts}
          fontId={fontId}
          onChoose={chooseFont}
          onPreview={requestThumbnail}
          status={state.status}
        />
      </div>
      <TextSettings
        hasNativeColors={selectedFont?.hasNativeColors ?? false}
        palette={selectedFont?.palette}
        colorReplacements={colorReplacements}
        onFontColorChange={changeFontColor}
        fontNote={selectedFont?.note ?? null}
        canExport={result !== null && !busy}
        exportError={error}
        dimensions={
          result ? `${result.widthInCells} × ${result.heightInCells}` : "—"
        }
        onExport={(format) => void download(format)}
        color={foregroundColor}
        onColorChange={changeColor}
        onReset={() => {
          setZoom(previewZoom.default);
          resetColors();
        }}
      />
    </main>
  );
}
