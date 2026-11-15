import { Button } from "../ui/base/button";
import { Slider } from "../ui/base/slider";
import { RotateCcwIcon } from "../ui/icons";
import type { CompactArtOptions } from "./compact-types";
import { CompactChoices } from "./compact-choices";

export function CompactCropSettings({
  options,
  onChange
}: {
  options: CompactArtOptions;
  onChange: (options: CompactArtOptions) => void;
}) {
  return (
    <section className="space-y-5 p-5" aria-label="Crop settings">
      <CompactChoices
        label="Crop"
        value={String(options.cropAspectRatio)}
        items={[
          { value: "1", label: "Square" },
          { value: "0", label: "Full image" },
          { value: "0.75", label: "Portrait" },
          { value: String(4 / 3), label: "Landscape" }
        ]}
        onChange={(value) =>
          onChange({ ...options, cropAspectRatio: Number(value) })
        }
      />
      {(
        [
          ["cropZoom", "Crop zoom", 1, 6],
          ["cropX", "Center X", 0, 1],
          ["cropY", "Center Y", 0, 1]
        ] as const
      ).map(([key, label, min, max]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <label id={`compact-${key}-label`}>{label}</label>
            <output className="font-mono text-xs text-muted-foreground">
              {options[key].toFixed(2)}
            </output>
          </div>
          <Slider
            aria-labelledby={`compact-${key}-label`}
            min={min}
            max={max}
            step={0.01}
            value={[options[key]]}
            onValueChange={(value) => {
              const next = typeof value === "number" ? value : value[0];
              if (next !== undefined) onChange({ ...options, [key]: next });
            }}
          />
        </div>
      ))}
      <Button
        variant="outline"
        className="h-10 w-full"
        onClick={() =>
          onChange({ ...options, quarterTurns: (options.quarterTurns + 1) % 4 })
        }
      >
        <RotateCcwIcon aria-hidden="true" /> Rotate 90°
      </Button>
    </section>
  );
}
