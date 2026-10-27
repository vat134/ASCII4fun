import { useRef, useState } from "react";
import { AsciiSpinner } from "../ui/ascii-spinner";
import { Button } from "../ui/base/button";
import { Input } from "../ui/base/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/base/tabs";
import {
  ImageIcon,
  LinkIcon,
  TypeIcon,
  UploadIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon
} from "../ui/icons";
import { AsciiPreview } from "./ascii-preview";
import type { ImageConfiguration } from "./image-conversion";
import { ImageSettings } from "./image-settings";
import { useImageConversion } from "./use-image-conversion";

const previewZoom = { min: 50, max: 200, step: 10, default: 100 };

export function ImageWorkspace({
  configuration
}: {
  configuration: ImageConfiguration;
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
  const [isDragging, setIsDragging] = useState(false);
  const result = "result" in state ? state.result : null;
  const dimensions = result
    ? `${result.widthInCells} × ${result.heightInCells}`
    : "—";

  function download() {
    if (state.status !== "ready" || !selection) return;
    const url = URL.createObjectURL(
      new Blob([state.result.text], { type: "text/plain;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selection.file.name.replace(/\.[^.]+$/u, "")}.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

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

      <aside aria-label="Source" className="shrink-0 lg:w-48 xl:w-52 2xl:w-56">
        <Tabs
          defaultValue="media"
          className="gap-0 overflow-hidden rounded-xl border bg-card"
        >
          <div className="space-y-4 p-4">
            <h2 className="text-sm">ASCII type</h2>
            <TabsList className="h-11 w-full">
              <TabsTrigger
                value="text"
                disabled
                title="Text conversion is coming later"
              >
                <TypeIcon aria-hidden="true" /> Text
              </TabsTrigger>
              <TabsTrigger value="media">
                <ImageIcon aria-hidden="true" /> Media
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="media" className="space-y-4 border-t p-4">
            <h3 className="font-mono text-xs text-muted-foreground uppercase">
              Source
            </h3>
            {selection ? (
              <>
                <img
                  src={selection.url}
                  alt="Uploaded source thumbnail"
                  className="max-h-40 w-full rounded-md bg-muted object-contain"
                />
                <p className="break-all font-mono text-xs leading-relaxed">
                  {selection.file.name}
                </p>
                <Button
                  className="h-10 w-full"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                >
                  <UploadIcon aria-hidden="true" /> Replace
                </Button>
              </>
            ) : (
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                JPEG, PNG or WebP.
                <br />
                One image at a time.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </aside>

      <section
        aria-label="Preview workspace"
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card lg:h-full lg:max-h-200"
      >
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
                  setZoom((value) =>
                    Math.max(previewZoom.min, value - previewZoom.step)
                  )
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
                  setZoom((value) =>
                    Math.min(previewZoom.max, value + previewZoom.step)
                  )
                }
              >
                <ZoomInIcon aria-hidden="true" />
              </Button>
            </div>
            {selection && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove image"
                onClick={clear}
              >
                <XIcon aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <div
          className={`relative flex h-96 min-h-64 items-center justify-center overflow-hidden bg-background transition-colors sm:h-128 lg:h-auto lg:min-h-0 lg:flex-1 ${isDragging ? "ring-2 ring-inset ring-foreground" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) selectImage(file);
          }}
        >
          {result ? (
            <div
              className={`size-full p-5 transition-opacity ${state.status === "pending" ? "opacity-40" : "opacity-100"}`}
            >
              <AsciiPreview
                result={result}
                characterCellAspectRatio={
                  configuration.defaultCharacterCellAspectRatio
                }
                zoom={zoom}
              />
            </div>
          ) : state.status === "empty" ? (
            <div className="w-full max-w-sm space-y-6 px-5 text-center">
              <Button
                variant="ghost"
                className="h-auto w-full flex-col gap-4 rounded-xl border border-dashed border-border px-6 py-10 hover:border-foreground"
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon
                  className="size-7 text-muted-foreground"
                  aria-hidden="true"
                />
                <span>Drop an image here</span>
                <span className="font-mono text-xs text-muted-foreground">
                  or click to browse
                </span>
              </Button>
              <p className="font-mono text-xs text-muted-foreground">
                JPEG / PNG / WebP · up to{" "}
                {configuration.maxEncodedBytes / (1024 * 1024)} MiB
              </p>
              <div className="relative">
                <LinkIcon
                  className="absolute top-3.5 left-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Media URL"
                  disabled
                  placeholder="Paste media URL · coming later"
                  className="h-11 pl-10 font-mono text-xs"
                />
              </div>
            </div>
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
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => inputRef.current?.click()}
                >
                  Choose image
                </Button>
                {selection && (
                  <Button className="h-10" onClick={retry}>
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

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
          changeOptions({
            outputWidthInCells: configuration.defaultOutputWidthInCells,
            characterRamp: configuration.defaultCharacterRamp,
            invert: true
          });
        }}
        canExport={state.status === "ready"}
        onExport={download}
        dimensions={dimensions}
      />
    </main>
  );
}
