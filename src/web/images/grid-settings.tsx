import { NumberField } from "@base-ui/react/number-field";
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
  return (
    <section className="space-y-5 p-5" aria-labelledby="grid-heading">
      <h3
        id="grid-heading"
        className="font-mono text-xs text-muted-foreground uppercase"
      >
        Grid
      </h3>
      <div className="flex items-center justify-between gap-3">
        <label
          id="grid-columns-label"
          htmlFor="grid-columns"
          className="text-sm"
        >
          Columns
        </label>
        <NumberField.Root
          id="grid-columns"
          min={minWidthInCells}
          max={maxWidthInCells}
          smallStep={1}
          value={widthInCells}
          format={{ maximumFractionDigits: 0, useGrouping: false }}
          onValueChange={(value) => {
            if (value !== null) onWidthChange(value);
          }}
        >
          <NumberField.Input
            render={<Input />}
            className="h-10 w-16 text-center font-mono"
            onFocus={(event) => event.currentTarget.select()}
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
          if (width !== undefined) onWidthChange(width);
        }}
      />
      <p className="font-mono text-xs leading-relaxed text-muted-foreground">
        More columns preserve finer details.
      </p>
    </section>
  );
}
