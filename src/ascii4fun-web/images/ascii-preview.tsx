import type { AsciiText } from "./image-conversion";

type AsciiPreviewProps = {
  result: AsciiText;
  characterCellAspectRatio: number;
  zoom: number;
};

export function AsciiPreview({
  result,
  characterCellAspectRatio,
  zoom
}: AsciiPreviewProps) {
  const rowHeight = 1 / characterCellAspectRatio;
  // Fallback fonts may have different advances; every column keeps its grid position.
  const columnPositions = Array.from(
    { length: result.widthInCells },
    (_, column) => column
  ).join(" ");
  return (
    <div className="flex size-full overflow-auto">
      <svg
        role="img"
        aria-label={`ASCII preview, ${result.widthInCells} columns by ${result.heightInCells} rows`}
        viewBox={`0 0 ${result.widthInCells} ${result.heightInCells * rowHeight}`}
        className="m-auto shrink-0 overflow-hidden fill-current font-mono"
        style={{ width: `${zoom}%`, height: `${zoom}%` }}
      >
        <text
          fontSize={rowHeight}
          dominantBaseline="hanging"
          className="whitespace-pre"
        >
          {result.text.split("\n").map((row, index) => (
            <tspan
              key={index}
              x={columnPositions}
              y={index * rowHeight}
              textLength={result.widthInCells}
              lengthAdjust="spacingAndGlyphs"
            >
              {row}
            </tspan>
          ))}
        </text>
      </svg>
    </div>
  );
}
