import type { FontColorReplacements } from "./text-conversion";

export function TextFontColors({
  palette,
  replacements,
  onChange
}: {
  palette: string[] | undefined;
  replacements: FontColorReplacements;
  onChange: (source: string, value: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm">Font colors</legend>
      {palette ? (
        <div className="grid grid-cols-2 gap-3">
          {palette.map((source, index) => (
            <label key={source} className="space-y-2 text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-sm border"
                  style={{ backgroundColor: source }}
                  aria-hidden="true"
                />
                Color {index + 1}
              </span>
              <input
                type="color"
                aria-label={`Font color ${source}`}
                value={replacements[source] ?? source}
                onChange={(event) =>
                  onChange(source, event.currentTarget.value)
                }
                className="h-10 w-full cursor-pointer rounded-lg border bg-background p-1.5"
              />
            </label>
          ))}
        </div>
      ) : (
        <p className="font-mono text-xs text-muted-foreground" role="status">
          Loading font colors…
        </p>
      )}
    </fieldset>
  );
}
