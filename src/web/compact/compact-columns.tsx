import { NumberField } from "@base-ui/react/number-field";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/base/button";
import { Input } from "../ui/base/input";

export function CompactColumns({
  columns,
  resolvedColumns,
  onChange
}: {
  columns: number;
  resolvedColumns?: number;
  onChange: (columns: number) => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  const change = useRef(onChange);
  const [reset, setReset] = useState(0);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => () => window.clearTimeout(timer.current), [columns]);
  function apply(value: number | null) {
    window.clearTimeout(timer.current);
    const next =
      value === null ? 0 : Math.max(4, Math.min(200, Math.round(value)));
    if (next !== (columns || resolvedColumns || 0)) onChange(next);
  }
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor="compact-columns" className="text-sm">
          Columns
        </label>
        <NumberField.Root
          key={reset}
          id="compact-columns"
          min={4}
          max={200}
          smallStep={1}
          value={columns || resolvedColumns || null}
          format={{ maximumFractionDigits: 0, useGrouping: false }}
          onValueChange={(value, details) => {
            window.clearTimeout(timer.current);
            if (
              value !== null &&
              (details.reason === "input-change" ||
                details.reason === "input-paste")
            ) {
              timer.current = window.setTimeout(
                () =>
                  change.current(Math.max(4, Math.min(200, Math.round(value)))),
                1000
              );
            }
          }}
          onValueCommitted={apply}
        >
          <NumberField.Group className="flex items-center rounded-lg border bg-background">
            <NumberField.Decrement
              render={<Button variant="ghost" className="h-10 shrink-0" />}
              aria-label="Decrease mini art columns"
            >
              −
            </NumberField.Decrement>
            <NumberField.Input
              render={<Input />}
              aria-label="Mini art columns"
              placeholder="Auto"
              className="h-10 min-w-0 w-full border-0 bg-transparent text-center font-mono shadow-none"
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
            <NumberField.Increment
              render={<Button variant="ghost" className="h-10 shrink-0" />}
              aria-label="Increase mini art columns"
            >
              +
            </NumberField.Increment>
          </NumberField.Group>
        </NumberField.Root>
      </div>
      <Button
        className="h-10"
        variant={columns === 0 ? "secondary" : "outline"}
        aria-pressed={columns === 0}
        onClick={() => {
          window.clearTimeout(timer.current);
          setReset((value) => value + 1);
          onChange(0);
        }}
      >
        Auto
      </Button>
    </div>
  );
}
