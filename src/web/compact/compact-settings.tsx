import { SettingsPanel } from "../ui/components/settings-panel";
import type { ReactNode } from "react";
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
    <SettingsPanel
      label="Mini art settings"
      resetLabel="Reset mini art settings"
      onReset={onReset}
      resetTooltip={false}
      exportPanel={exportPanel}
    >
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
    </SettingsPanel>
  );
}
