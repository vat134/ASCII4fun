import { Switch } from "../ui/base/switch";
import type { CharacterImageOptions } from "./image-conversion";

type Props = {
  options: CharacterImageOptions;
  onChange: (options: CharacterImageOptions) => void;
};

export function PhotoProcessingSettings({ options, onChange }: Props) {
  return (
    <section className="space-y-4 p-5" aria-label="Photo processing">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <label htmlFor="photo-style" className="text-sm">
          Photo processing
        </label>
        <Switch
          id="photo-style"
          checked={options.usePhotoStyle}
          aria-describedby="photo-style-description"
          onCheckedChange={(usePhotoStyle) =>
            onChange({ ...options, usePhotoStyle })
          }
        />
      </div>
      <p id="photo-style-description" className="text-xs text-muted-foreground">
        {options.usePhotoStyle
          ? "Photo: enhance local detail and match ASCII strokes to shapes. Uses its own measured character set."
          : "Classic: map tones to your selected characters."}
      </p>
    </section>
  );
}
