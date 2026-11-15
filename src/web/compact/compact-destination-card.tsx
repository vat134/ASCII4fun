import { Button } from "../ui/base/button";
import type { CompactDestination, CompactPreviewResult } from "./compact-types";

export function CompactDestinationCard({
  destination,
  result,
  selected,
  onSelect
}: {
  destination: CompactDestination;
  result: CompactPreviewResult | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const count = result?.destinationCounts?.[destination.id];
  const over =
    count !== undefined &&
    destination.limit !== null &&
    count > destination.limit;
  const wide =
    destination.limit !== null &&
    result !== null &&
    result.widthInCells > destination.recommendedColumns;
  const status =
    count === undefined
      ? null
      : over
        ? "Over limit"
        : wide
          ? "May wrap"
          : "Fits";
  return (
    <Button
      aria-label={destination.platform}
      aria-pressed={selected}
      variant="outline"
      onClick={onSelect}
      className={`h-auto min-w-0 flex-col items-stretch gap-1 whitespace-normal px-3 py-2 text-left ${selected ? "border-foreground" : ""}`}
    >
      <span className="text-xs font-medium">{destination.platform}</span>
      <span className="text-[10px] text-muted-foreground">
        {destination.limit === null
          ? "TXT · PNG · No text limit"
          : `${destination.name} · ${count === undefined ? "" : `${count} / `}${destination.limit} ${destination.unit}`}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {status ?? "Choose an image"}
      </span>
      {count !== undefined && destination.limit !== null && (
        <progress
          aria-label={`${destination.platform} text budget`}
          max={destination.limit}
          value={Math.min(count, destination.limit)}
          className={`h-1 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-current [&::-moz-progress-bar]:bg-current ${over ? "text-rose-500" : wide ? "text-amber-500" : "text-emerald-500"}`}
        />
      )}
    </Button>
  );
}
