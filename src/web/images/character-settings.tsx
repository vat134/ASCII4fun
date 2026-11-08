import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/base/select";
import { Switch } from "../ui/base/switch";
import type { ImageStyle } from "./image-conversion";
import {
  CharacterRampSettings,
  type CharacterRampSettingsProps
} from "./character-ramp-settings";
export type { CharacterEditor } from "./character-ramp-settings";

const imageStyles = [
  { value: "characters", label: "Characters" },
  { value: "braille", label: "Braille" }
] satisfies { value: ImageStyle; label: string }[];

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
      <label htmlFor="image-style" className="block text-sm">
        Style
      </label>
      <Select
        items={imageStyles}
        value={options.style}
        onValueChange={(style) => {
          if (style !== null) onChange({ ...options, style });
        }}
      >
        <SelectTrigger id="image-style" className="h-10 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {imageStyles.map((style) => (
            <SelectItem key={style.value} value={style.value}>
              {style.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {options.style === "characters" ? (
        <CharacterRampSettings
          defaultRamp={defaultRamp}
          editor={editor}
          options={options}
          onEditorChange={onEditorChange}
          onChange={onChange}
        />
      ) : (
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          Eight spatial dots per cell. Copy and TXT preserve empty Braille
          cells.
        </p>
      )}
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
