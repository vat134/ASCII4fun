import { Button } from "../ui/base/button";
import type {
  CompactArtOptions,
  CompactDestination,
  CompactPreviewResult
} from "./compact-types";
import { CompactDestinationCard } from "./compact-destination-card";
import { CompactColumns } from "./compact-columns";

export function CompactDestinationSettings({
  options,
  destinations,
  result,
  onChange
}: {
  options: CompactArtOptions;
  destinations: CompactDestination[];
  result: CompactPreviewResult | null;
  onChange: (options: CompactArtOptions) => void;
}) {
  const destination = destinations.find(
    (item) => item.id === options.destination
  );
  const platforms = [...new Set(destinations.map((item) => item.platform))];
  const fields = destinations.filter(
    (item) => item.platform === destination?.platform
  );
  return (
    <section className="space-y-4 p-5" aria-label="Destination settings">
      <div className="space-y-2">
        <p className="text-sm">Where will you paste it?</p>
        <div
          role="group"
          aria-label="Destination"
          className="grid grid-cols-2 gap-2"
        >
          {platforms.map((platform) => {
            const target = (
              destination?.platform === platform
                ? destination
                : destinations.find((item) => item.platform === platform)
            )!;
            return (
              <CompactDestinationCard
                key={platform}
                destination={target}
                result={result}
                selected={destination?.platform === platform}
                onSelect={() => {
                  if (target.id !== options.destination)
                    onChange({
                      ...options,
                      destination: target.id,
                      columns: 0
                    });
                }}
              />
            );
          })}
        </div>
      </div>
      {destination?.platform === "Steam" && (
        <div
          role="group"
          aria-label="Steam field"
          className="flex flex-wrap gap-1"
        >
          {fields.map((field) => (
            <Button
              key={field.id}
              className="flex-1"
              variant={field.id === options.destination ? "secondary" : "ghost"}
              aria-pressed={field.id === options.destination}
              onClick={() =>
                onChange({ ...options, destination: field.id, columns: 0 })
              }
            >
              {field.name}
            </Button>
          ))}
        </div>
      )}
      <CompactColumns
        key={options.destination}
        columns={options.columns}
        resolvedColumns={result?.widthInCells ?? 0}
        onChange={(columns) => onChange({ ...options, columns })}
      />
      {result && (
        <p className="text-xs text-muted-foreground">
          Height follows the crop · {result.heightInCells} rows
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Auto uses up to {destination?.recommendedColumns} columns and fits the
        destination budget. Font and wrapping can vary after pasting.
      </p>
    </section>
  );
}
