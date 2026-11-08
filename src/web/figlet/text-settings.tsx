import { ArtworkExport } from "../rendering/artwork-export";
import { Button } from "../ui/base/button";
import { TextFontColors } from "./text-font-colors";
import type { FontColorReplacements } from "./text-conversion";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/base/tooltip";
import { RotateCcwIcon, SlidersHorizontalIcon } from "../ui/icons";

export function TextSettings({
  color,
  onColorChange,
  onReset,
  canExport,
  exportError,
  dimensions,
  onExport,
  hasNativeColors,
  palette,
  colorReplacements,
  onFontColorChange,
  fontNote
}: {
  color: string;
  onColorChange: (value: string) => void;
  onReset: () => void;
  canExport: boolean;
  exportError: string | null;
  dimensions: string;
  onExport: (format: "txt" | "png") => void;
  hasNativeColors: boolean;
  palette: string[] | undefined;
  colorReplacements: FontColorReplacements;
  onFontColorChange: (source: string, value: string) => void;
  fontNote: string | null;
}) {
  return (
    <aside
      aria-label="Text settings"
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:h-full lg:w-80 xl:w-88"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
        <h2 className="flex items-center gap-2 text-sm">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />{" "}
          Settings
        </h2>
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" />}
            aria-label="Reset text settings"
            onClick={onReset}
          >
            <RotateCcwIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Reset text settings</TooltipContent>
        </Tooltip>
      </div>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
        <section className="space-y-5 p-5" aria-label="Text appearance">
          {hasNativeColors ? (
            <TextFontColors
              palette={palette}
              replacements={colorReplacements}
              onChange={onFontColorChange}
            />
          ) : (
            <label className="block space-y-2 text-sm">
              <span>Text color</span>
              <input
                type="color"
                aria-label="Text color"
                value={color}
                onChange={(event) => onColorChange(event.currentTarget.value)}
                className="h-10 w-full cursor-pointer rounded-lg border bg-background p-1.5"
              />
            </label>
          )}
          {fontNote && (
            <p className="font-mono text-xs text-muted-foreground">
              {fontNote}
            </p>
          )}
        </section>
      </div>
      <ArtworkExport
        canExport={canExport}
        error={exportError}
        dimensions={dimensions}
        onExport={onExport}
      />
    </aside>
  );
}
