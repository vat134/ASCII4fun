import type { CompactDestination, CompactPreviewResult } from "./compact-types";

export function CompactBudget({
  result,
  destination
}: {
  result: CompactPreviewResult;
  destination: CompactDestination;
}) {
  const { count, limit, unit, fits, recommendedColumns } = result.payload;
  return (
    <div className="space-y-2" aria-label="Artwork size and budget">
      {limit !== null && (
        <progress
          aria-label="Selected field text budget"
          max={limit}
          value={Math.min(count, limit)}
          className={`h-1 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-current [&::-moz-progress-bar]:bg-current ${fits ? "text-emerald-500" : "text-rose-500"}`}
        />
      )}
      <p>
        {count}
        {limit === null ? "" : ` / ${limit}`} {unit}
        {limit === null
          ? " · No text limit"
          : fits
            ? ` · ${limit - count} ${unit} left`
            : ` · ${count - limit} ${unit} over limit. Use Auto or fewer columns.`}
      </p>
      <p>
        Columns: 4–200 · Auto: {recommendedColumns}
        {destination.limit !== null
          ? ` · Recommended width: ≤${destination.recommendedColumns}`
          : ""}
      </p>
    </div>
  );
}
