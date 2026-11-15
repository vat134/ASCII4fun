import { Button } from "../ui/base/button";
import type { CompactArtOptions, CompactPreviewResult } from "./compact-types";

export function CompactLooks({
  options,
  result,
  onChange
}: {
  options: CompactArtOptions;
  result: CompactPreviewResult | null;
  onChange: (options: CompactArtOptions) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm">Look</p>
      <div role="group" aria-label="Look" className="grid grid-cols-5 gap-1">
        {["Photo", "Texture", "Sketch", "Soft", "Poster"].map((label) => {
          const look = label.toLowerCase();
          const text = result?.lookPreviews?.[look];
          const width = (result?.widthInCells ?? 1) * 12;
          const height = (result?.heightInCells ?? 1) * 24;
          return (
            <Button
              key={look}
              aria-label={label}
              aria-pressed={options.look === look}
              variant={options.look === look ? "outline" : "ghost"}
              className="h-auto min-w-0 flex-col gap-2 px-0.5 py-1 text-[10px]"
              onClick={() => onChange({ ...options, look })}
            >
              <span
                className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md"
                style={{
                  background: options.invert ? "black" : "white",
                  color: options.invert ? "white" : "black"
                }}
              >
                {text ? (
                  <svg
                    role="img"
                    aria-label={`${label} look preview`}
                    className="size-full grayscale"
                    viewBox={`0 0 ${width} ${height}`}
                  >
                    {text.split("\n").map((line, row) => (
                      <text
                        key={row}
                        x={Array.from(
                          { length: result?.widthInCells ?? 1 },
                          (_, column) => column * 12
                        ).join(" ")}
                        y={row * 24 + 21}
                        fontFamily="monospace"
                        fontSize="24"
                        fill="currentColor"
                      >
                        {line}
                      </text>
                    ))}
                  </svg>
                ) : (
                  <span
                    aria-hidden="true"
                    className="text-lg text-muted-foreground"
                  >
                    ·
                  </span>
                )}
              </span>
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
