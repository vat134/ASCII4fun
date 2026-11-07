import { NumberField } from "@base-ui/react/number-field";
import { useEffect, useRef } from "react";
import { Button } from "../ui/base/button";
import { Input } from "../ui/base/input";
import { Slider } from "../ui/base/slider";

type GridSettingsProps = {
  minWidthInCells: number;
  maxWidthInCells: number;
  widthInCells: number;
  onWidthChange: (widthInCells: number) => void;
};

export function GridSettings({
  minWidthInCells,
  maxWidthInCells,
  widthInCells,
  onWidthChange
}: GridSettingsProps) {
  const inputTimer = useRef<number | undefined>(undefined);
  const inputWidth = useRef(widthInCells);
  const changeWidth = useRef(onWidthChange);
  useEffect(() => {
    // Delayed input must use current settings, even if another control changed.
    changeWidth.current = onWidthChange;
  }, [onWidthChange]);
  useEffect(() => {
    inputWidth.current = widthInCells;
    return () => window.clearTimeout(inputTimer.current);
  }, [widthInCells]);

  function applyWidth(value: number | null) {
    window.clearTimeout(inputTimer.current);
    if (value === null) return;
    inputWidth.current = value;
    if (value !== widthInCells) onWidthChange(value);
  }

  return (
    <section className="space-y-5 p-5" aria-labelledby="grid-heading">
      <h3
        id="grid-heading"
        className="font-mono text-xs text-muted-foreground uppercase"
      >
        Grid
      </h3>
      <div className="flex items-center justify-between gap-2">
        <label
          id="grid-columns-label"
          htmlFor="grid-columns"
          className="text-sm"
        >
          Columns
        </label>
        <div className="flex flex-1 justify-end gap-1.5">
          {(
            [
              ["x2", (width: number) => width * 2, "Double columns"],
              ["/2", (width: number) => width / 2, "Halve columns"],
              ["+10", (width: number) => width + 10, "Add 10 columns"],
              ["-10", (width: number) => width - 10, "Subtract 10 columns"]
            ] as const
          ).map(([label, transform, accessibleLabel]) => (
            <Button
              key={label}
              variant="secondary"
              size="xs"
              className="h-9 px-1.5 font-mono"
              aria-label={accessibleLabel}
              onClick={() =>
                applyWidth(
                  Math.min(
                    maxWidthInCells,
                    Math.max(
                      minWidthInCells,
                      Math.round(transform(inputWidth.current))
                    )
                  )
                )
              }
            >
              {label}
            </Button>
          ))}
        </div>
        <NumberField.Root
          id="grid-columns"
          min={minWidthInCells}
          max={maxWidthInCells}
          smallStep={1}
          value={widthInCells}
          format={{ maximumFractionDigits: 0, useGrouping: false }}
          onValueChange={(value, details) => {
            window.clearTimeout(inputTimer.current);
            inputWidth.current = value ?? widthInCells;
            if (
              value !== null &&
              value !== widthInCells &&
              (details.reason === "input-change" ||
                details.reason === "input-paste")
            ) {
              inputTimer.current = window.setTimeout(
                () => changeWidth.current(value),
                1000
              );
            }
          }}
          onValueCommitted={applyWidth}
        >
          <NumberField.Input
            render={<Input />}
            className="h-10 w-16 text-center font-mono"
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </NumberField.Root>
      </div>
      <Slider
        aria-labelledby="grid-columns-label"
        min={minWidthInCells}
        max={maxWidthInCells}
        value={[widthInCells]}
        onValueChange={(value) => {
          const [width] = value as number[];
          if (width !== undefined) applyWidth(width);
        }}
      />
      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
        More columns preserve finer details.
      </p>
    </section>
  );
}
