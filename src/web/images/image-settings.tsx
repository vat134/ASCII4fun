import { useState } from "react";
import { Button } from "../ui/base/button";
import { Switch } from "../ui/base/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/base/tooltip";
import {
  ArrowDownToLineIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon
} from "../ui/icons";
import { CharacterSettings, type CharacterEditor } from "./character-settings";
import { GridSettings } from "./grid-settings";
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
  onExport: (format: "txt" | "png") => void;
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
  const defaultEditor: CharacterEditor = {
    selectedSet: "Classic ASCII",
    customRamp: configuration.defaultCharacterRamp
  };
  const [editor, setEditor] = useState(defaultEditor);
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
              setEditor(defaultEditor);
              onReset();
            }}
          >
            <RotateCcwIcon aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Reset to default</TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
        <GridSettings
          minWidthInCells={configuration.minOutputWidthInCells}
          maxWidthInCells={configuration.maxOutputWidthInCells}
          widthInCells={options.outputWidthInCells}
          onWidthChange={(outputWidthInCells) =>
            onChange({ ...options, outputWidthInCells })
          }
        />
        <CharacterSettings
          defaultRamp={configuration.defaultCharacterRamp}
          editor={editor}
          options={options}
          onEditorChange={setEditor}
          onChange={onChange}
        />
        <div className="flex min-h-11 items-center justify-between gap-3 p-5">
          <label htmlFor="source-colors" className="text-sm">
            Source colors
          </label>
          <Switch
            id="source-colors"
            checked={options.sourceColors}
            onCheckedChange={(sourceColors) =>
              onChange({ ...options, sourceColors })
            }
          />
        </div>
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
          onClick={() => onExport("png")}
        >
          <ArrowDownToLineIcon aria-hidden="true" /> Download PNG
        </Button>
        <Button
          variant="outline"
          className="h-11 w-full"
          disabled={!canExport}
          onClick={() => onExport("txt")}
        >
          <ArrowDownToLineIcon aria-hidden="true" /> Download .txt
        </Button>
        <p className="text-center font-mono text-xs text-muted-foreground">
          PNG matches preview · TXT saves characters only
        </p>
      </footer>
    </aside>
  );
}
