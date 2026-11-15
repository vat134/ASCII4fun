import { SettingsPanel } from "../ui/components/settings-panel";
import { ArtworkExport } from "../rendering/artwork-export";
import { TextFontColors } from "./text-font-colors";
import type { FontColorReplacements } from "./text-conversion";

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
    <SettingsPanel
      label="Text settings"
      resetLabel="Reset text settings"
      onReset={onReset}
      exportPanel={
        <ArtworkExport
          canExport={canExport}
          error={exportError}
          dimensions={dimensions}
          onExport={onExport}
        />
      }
    >
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
          <p className="font-mono text-xs text-muted-foreground">{fontNote}</p>
        )}
      </section>
    </SettingsPanel>
  );
}
