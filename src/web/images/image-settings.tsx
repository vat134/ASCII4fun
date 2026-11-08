import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "../ui/base/button";
import { ToneColorSettings } from "./tone-color-settings";
import { PhotoBackgroundSettings } from "./photo-background-settings";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/base/tooltip";
import { RotateCcwIcon, SlidersHorizontalIcon } from "../ui/icons";
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
  exportPanel: ReactNode;
};

export function ImageSettings({
  configuration,
  options,
  onChange,
  onReset,
  exportPanel
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
        <ToneColorSettings
          configuration={configuration}
          options={options}
          onChange={onChange}
        />
        <PhotoBackgroundSettings
          configuration={configuration}
          options={options}
          onChange={onChange}
        />
      </div>

      {exportPanel}
    </aside>
  );
}
