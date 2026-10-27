import { useState } from "react";
import { NumberField } from "@base-ui/react/number-field";
import { Button } from "../ui/base/button";
import { Input } from "../ui/base/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "../ui/base/select";
import { Slider } from "../ui/base/slider";
import { Switch } from "../ui/base/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/base/tooltip";
import {
  ArrowDownToLineIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon
} from "../ui/icons";
import { getCharacterSets } from "./character-sets";
import type {
  CharacterImageOptions,
  ImageConfiguration
} from "./image-conversion";

type ImageSettingsProps = {
  configuration: ImageConfiguration;
  options: CharacterImageOptions;
  onChange: (options: CharacterImageOptions) => void;
  onReset: () => void;
  canExport: boolean;
  onExport: () => void;
  dimensions: string;
};

export function ImageSettings({
  configuration,
  options,
  onChange,
  onReset,
  canExport,
  onExport,
  dimensions
}: ImageSettingsProps) {
  const [selectedSet, setSelectedSet] = useState("Classic ASCII");
  const [customRamp, setCustomRamp] = useState(
    configuration.defaultCharacterRamp
  );
  const groups = getCharacterSets(configuration.defaultCharacterRamp);
  return (
    <aside
      aria-label="Conversion settings"
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:h-full lg:w-80 xl:w-88"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-5">
        <h2 className="flex items-center gap-2 text-sm">
          <SlidersHorizontalIcon className="size-4" aria-hidden="true" />{" "}
          Settings
        </h2>
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" />}
            aria-label="Reset to default"
            onClick={() => {
              setSelectedSet("Classic ASCII");
              setCustomRamp(configuration.defaultCharacterRamp);
              onReset();
            }}
          >
            <RotateCcwIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Reset to default</TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
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
              min={configuration.minOutputWidthInCells}
              max={configuration.maxOutputWidthInCells}
              smallStep={1}
              value={options.outputWidthInCells}
              format={{ maximumFractionDigits: 0, useGrouping: false }}
              onValueChange={(value) => {
                if (value !== null) {
                  onChange({ ...options, outputWidthInCells: value });
                }
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
            min={configuration.minOutputWidthInCells}
            max={configuration.maxOutputWidthInCells}
            value={[options.outputWidthInCells]}
            onValueChange={(value) => {
              const [width] = value as number[];
              if (width !== undefined)
                onChange({ ...options, outputWidthInCells: width });
            }}
          />
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            More columns preserve finer details.
          </p>
        </section>

        <section className="space-y-4 p-5" aria-labelledby="characters-heading">
          <h3
            id="characters-heading"
            className="font-mono text-xs text-muted-foreground uppercase"
          >
            Characters
          </h3>
          <label htmlFor="character-set" className="block text-sm">
            Character set
          </label>
          <Select
            value={selectedSet}
            onValueChange={(name) => {
              if (name === null) return;
              setSelectedSet(name);
              const ramp =
                name === "Custom characters"
                  ? customRamp
                  : groups
                      .flatMap((group) => group.sets)
                      .find((set) => set.name === name)!.ramp;
              onChange({ ...options, characterRamp: ramp });
            }}
          >
            <SelectTrigger id="character-set" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className="max-h-[min(20rem,var(--available-height))]"
            >
              {groups.map((group) => (
                <SelectGroup key={group.name}>
                  <SelectLabel>{group.name}</SelectLabel>
                  {group.sets.map((set) => (
                    <SelectItem
                      key={set.name}
                      value={set.name}
                      label={set.name}
                    >
                      <span>{set.name}</span>
                      <span
                        aria-hidden="true"
                        className="ml-auto truncate font-mono text-xs text-muted-foreground"
                      >
                        {set.ramp}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
              <SelectItem value="Custom characters">
                Custom characters
              </SelectItem>
            </SelectContent>
          </Select>
          {selectedSet === "Custom characters" ? (
            <>
              <label htmlFor="character-ramp" className="block text-sm">
                Your characters
              </label>
              <Input
                id="character-ramp"
                className="h-11 font-mono"
                value={options.characterRamp}
                aria-describedby="ramp-help"
                onChange={(event) => {
                  const ramp = event.currentTarget.value.replace(
                    / {2,}/gu,
                    " "
                  );
                  setCustomRamp(ramp);
                  onChange({ ...options, characterRamp: ramp });
                }}
              />
            </>
          ) : (
            <>
              <p id="character-ramp-label" className="text-sm">
                Characters
              </p>
              <p
                aria-labelledby="character-ramp-label"
                className="min-h-11 rounded-lg border px-2.5 py-3 font-mono text-sm break-all whitespace-pre-wrap"
              >
                {options.characterRamp}
              </p>
            </>
          )}
          <p
            id="ramp-help"
            className="font-mono text-xs leading-relaxed text-muted-foreground"
          >
            Dark to light. One space represents an empty cell.
          </p>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <label htmlFor="invert-mapping" className="text-sm">
              Invert mapping
            </label>
            <Switch
              id="invert-mapping"
              checked={options.invert}
              onCheckedChange={(invert) => onChange({ ...options, invert })}
            />
          </div>
        </section>
      </div>

      <footer className="shrink-0 space-y-4 border-t bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm">Export</h3>
          <span className="font-mono text-xs text-muted-foreground">
            {dimensions}
          </span>
        </div>
        <Button
          className="h-11 w-full"
          disabled={!canExport}
          onClick={onExport}
        >
          <ArrowDownToLineIcon aria-hidden="true" /> Download .txt
        </Button>
        <p className="text-center font-mono text-xs text-muted-foreground">
          Plain text · UTF-8
        </p>
      </footer>
    </aside>
  );
}
