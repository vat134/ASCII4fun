import { SettingsPanel } from "../ui/components/settings-panel";
import type { ReactNode } from "react";
import { useState } from "react";
import { ToneColorSettings } from "./tone-color-settings";
import { PhotoBackgroundSettings } from "./photo-background-settings";
import { PhotoProcessingSettings } from "./photo-processing-settings";
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
    <SettingsPanel
      label="Conversion settings"
      resetLabel="Reset to default"
      onReset={() => {
        setEditor(defaultEditor);
        onReset();
      }}
      exportPanel={exportPanel}
    >
      <GridSettings
        minWidthInCells={configuration.minOutputWidthInCells}
        maxWidthInCells={configuration.maxOutputWidthInCells}
        widthInCells={options.outputWidthInCells}
        onWidthChange={(outputWidthInCells) =>
          onChange({ ...options, outputWidthInCells })
        }
      />
      <PhotoProcessingSettings options={options} onChange={onChange} />
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
    </SettingsPanel>
  );
}
