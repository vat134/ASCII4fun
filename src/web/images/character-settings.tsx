import { Switch } from "../ui/base/switch";
import {
  CharacterRampSettings,
  type CharacterRampSettingsProps
} from "./character-ramp-settings";
export type { CharacterEditor } from "./character-ramp-settings";

export function CharacterSettings({
  defaultRamp,
  editor,
  options,
  onEditorChange,
  onChange
}: CharacterRampSettingsProps) {
  return (
    <section className="space-y-4 p-5" aria-labelledby="characters-heading">
      <h3
        id="characters-heading"
        className="font-mono text-xs text-muted-foreground uppercase"
      >
        Characters
      </h3>
      <CharacterRampSettings
        defaultRamp={defaultRamp}
        editor={editor}
        options={options}
        onEditorChange={onEditorChange}
        onChange={onChange}
      />
      <div className="space-y-1">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <label htmlFor="measured-density" className="text-sm">
            Measured glyph density
          </label>
          <Switch
            id="measured-density"
            checked={options.useMeasuredGlyphDensity}
            aria-describedby="measured-density-description"
            onCheckedChange={(useMeasuredGlyphDensity) =>
              onChange({ ...options, useMeasuredGlyphDensity })
            }
          />
        </div>
        <p
          id="measured-density-description"
          className="text-xs text-muted-foreground"
        >
          Match tones to glyph density instead of ramp order.
        </p>
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <label htmlFor="invert-mapping" className="text-sm">
          Invert mapping
        </label>
        <Switch
          id="invert-mapping"
          checked={options.invert}
          onCheckedChange={(invert) => onChange({ ...options, invert })}
        />
      </div>
    </section>
  );
}
