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
import { Switch } from "../ui/base/switch";
import { getCharacterSets } from "./character-sets";
import type { CharacterImageOptions } from "./image-conversion";

export type CharacterEditor = { selectedSet: string; customRamp: string };

type CharacterSettingsProps = {
  defaultRamp: string;
  editor: CharacterEditor;
  options: CharacterImageOptions;
  onEditorChange: (editor: CharacterEditor) => void;
  onChange: (options: CharacterImageOptions) => void;
};

export function CharacterSettings({
  defaultRamp,
  editor,
  options,
  onEditorChange,
  onChange
}: CharacterSettingsProps) {
  const groups = getCharacterSets(defaultRamp);
  return (
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
        value={editor.selectedSet}
        onValueChange={(name) => {
          if (name === null) return;
          onEditorChange({ ...editor, selectedSet: name });
          const ramp =
            name === "Custom characters"
              ? editor.customRamp
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
                <SelectItem key={set.name} value={set.name} label={set.name}>
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
          <SelectItem value="Custom characters">Custom characters</SelectItem>
        </SelectContent>
      </Select>
      {editor.selectedSet === "Custom characters" ? (
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
              const ramp = event.currentTarget.value.replace(/ {2,}/gu, " ");
              onEditorChange({ ...editor, customRamp: ramp });
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
  );
}
