import { Slider } from "../ui/base/slider";
import { Switch } from "../ui/base/switch";
import type { CompactArtOptions } from "./compact-types";

export function CompactToneSettings({
  options,
  onChange,
  advanced = false
}: {
  options: CompactArtOptions;
  onChange: (options: CompactArtOptions) => void;
  advanced?: boolean;
}) {
  const controls = advanced
    ? ([
        ["gamma", "Gamma", 0.3, 3],
        ["detail", "Detail", 0, 1],
        ["edges", "Edges", 0, 1]
      ] as const)
    : ([
        ["brightness", "Brightness", -1, 1],
        ["contrast", "Contrast", -1, 1]
      ] as const);
  return (
    <section
      className="space-y-5 p-5"
      aria-label={advanced ? "Detail settings" : "Tone settings"}
    >
      {controls.map(([key, label, min, max]) => (
        <div className="space-y-2" key={key}>
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
      {!advanced &&
        (
          [
            ["invert", "Invert"],
            ["autoLevels", "Auto levels"]
          ] as const
        ).map(([key, label]) => (
          <div
            key={key}
            className="flex min-h-11 items-center justify-between gap-3"
          >
            <label htmlFor={`compact-${key}`} className="text-sm">
              {label}
            </label>
            <Switch
              id={`compact-${key}`}
              checked={options[key]}
              onCheckedChange={(value) =>
                onChange({ ...options, [key]: value })
              }
            />
          </div>
        ))}
    </section>
  );
}
