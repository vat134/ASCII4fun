import type { ReactNode } from "react";
import { Button } from "../ui/base/button";
import { RotateCcwIcon, SlidersHorizontalIcon } from "../ui/icons";
import type {
  CompactArtOptions,
  CompactDestination,
  CompactPreviewResult
} from "./compact-types";
import { CompactChoices } from "./compact-choices";
import { CompactLooks } from "./compact-looks";
import { CompactDestinationSettings } from "./compact-destination-settings";
import { CompactToneSettings } from "./compact-tone-settings";
import { CompactCropSettings } from "./compact-crop-settings";

export function CompactSettings({
  options,
  destinations,
  result,
  onChange,
  onReset,
  exportPanel
}: {
  options: CompactArtOptions;
  destinations: CompactDestination[];
  result: CompactPreviewResult | null;
  onChange: (options: CompactArtOptions) => void;
  onReset: () => void;
  exportPanel: ReactNode;
}) {
  return (
    <aside
      aria-label="Mini art settings"
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:h-full lg:w-80 xl:w-88"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
        <h2 className="flex items-center gap-2 text-sm">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />{" "}
          Settings
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Reset mini art settings"
          onClick={onReset}
        >
          <RotateCcwIcon aria-hidden="true" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
        <CompactDestinationSettings
          options={options}
          destinations={destinations}
          result={result}
          onChange={onChange}
        />
        <section className="space-y-4 p-5" aria-label="Braille look">
          <p className="text-xs text-muted-foreground">
            Spatial dots · Unicode Braille
          </p>
          <CompactLooks options={options} result={result} onChange={onChange} />
          <CompactChoices
            label="Dither"
            value={options.dither}
            items={[
              { value: "atkinson", label: "Atkinson" },
              { value: "floyd", label: "Floyd–Steinberg" },
              { value: "bayer", label: "Bayer" },
              { value: "threshold", label: "Threshold" }
            ]}
            onChange={(dither) => onChange({ ...options, dither })}
          />
        </section>
        <CompactToneSettings options={options} onChange={onChange} />
        <details className="group">
          <summary className="cursor-pointer p-5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground">
            More controls
          </summary>
          <CompactToneSettings advanced options={options} onChange={onChange} />
          <CompactCropSettings options={options} onChange={onChange} />
        </details>
      </div>
      {exportPanel}
    </aside>
  );
}
