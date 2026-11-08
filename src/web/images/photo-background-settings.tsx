import { Slider } from "../ui/base/slider";
import type {
  CharacterImageOptions,
  ImageConfiguration
} from "./image-conversion";

type Props = {
  configuration: ImageConfiguration;
  options: CharacterImageOptions;
  onChange: (options: CharacterImageOptions) => void;
};

export function PhotoBackgroundSettings({
  configuration,
  options,
  onChange
}: Props) {
  return (
    <section className="space-y-3 p-5" aria-label="Photo background settings">
      <div className="flex items-center justify-between text-sm">
        <label id="source-photo-label">Source photo</label>
        <output className="font-mono text-xs text-muted-foreground">
          {options.sourcePhotoOpacity}%
        </output>
      </div>
      <Slider
        aria-labelledby="source-photo-label"
        min={0}
        max={configuration.maxPercentage}
        value={[options.sourcePhotoOpacity]}
        onValueChange={(value) => {
          const sourcePhotoOpacity =
            typeof value === "number" ? value : value[0];
          if (sourcePhotoOpacity !== undefined)
            onChange({ ...options, sourcePhotoOpacity });
        }}
      />
      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
        Original photo beneath the characters. Set to 0% to hide.
      </p>
    </section>
  );
}
