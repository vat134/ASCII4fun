import { Button } from "../ui/base/button";
import { Slider } from "../ui/base/slider";
import type {
  CharacterImageOptions,
  ImageConfiguration,
  RgbColor
} from "./image-conversion";

const toHex = (color: RgbColor) =>
  `#${[color.red, color.green, color.blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
const fromHex = (hex: string): RgbColor => ({
  red: parseInt(hex.slice(1, 3), 16),
  green: parseInt(hex.slice(3, 5), 16),
  blue: parseInt(hex.slice(5, 7), 16)
});

type Props = {
  configuration: ImageConfiguration;
  options: CharacterImageOptions;
  onChange: (options: CharacterImageOptions) => void;
};

export function ToneColorSettings({ configuration, options, onChange }: Props) {
  return (
    <>
      <section className="space-y-5 p-5" aria-label="Tone settings">
        {(
          [
            [
              "contrast",
              "Contrast",
              configuration.minToneAdjustment,
              configuration.maxToneAdjustment
            ],
            [
              "brightness",
              "Brightness",
              configuration.minToneAdjustment,
              configuration.maxToneAdjustment
            ],
            ["shadowLift", "Shadow lift", 0, configuration.maxPercentage]
          ] as const
        ).map(([key, label, min, max]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label id={`${key}-label`}>{label}</label>
              <output className="font-mono text-xs text-muted-foreground">
                {key !== "shadowLift" && options[key] > 0 ? "+" : ""}
                {options[key]}
              </output>
            </div>
            <Slider
              aria-labelledby={`${key}-label`}
              min={min}
              max={max}
              value={[options[key]]}
              onValueChange={(value) => {
                const [next] = value as number[];
                if (next !== undefined) onChange({ ...options, [key]: next });
              }}
            />
          </div>
        ))}
      </section>
      <section className="space-y-5 p-5" aria-label="Color settings">
        <div className="space-y-2">
          <h3 className="text-sm">Color</h3>
          <div className="flex gap-2" role="group" aria-label="Color mode">
            {(
              [
                [false, "Mono"],
                [true, "Original"]
              ] as const
            ).map(([sourceColors, label]) => (
              <Button
                key={label}
                className="flex-1"
                variant={
                  options.sourceColors === sourceColors ? "secondary" : "ghost"
                }
                aria-pressed={options.sourceColors === sourceColors}
                onClick={() => onChange({ ...options, sourceColors })}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              ["monochromeColor", "Mono color"],
              ["backgroundColor", "Background"]
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="space-y-2 text-xs text-muted-foreground"
            >
              {" "}
              <span>{label}</span>
              <input
                type="color"
                aria-label={label}
                value={toHex(options[key])}
                disabled={key === "monochromeColor" && options.sourceColors}
                onChange={(event) =>
                  onChange({
                    ...options,
                    [key]: fromHex(event.currentTarget.value)
                  })
                }
                className="h-10 w-full cursor-pointer rounded-lg border bg-background p-1.5 disabled:cursor-default disabled:opacity-40"
              />
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
