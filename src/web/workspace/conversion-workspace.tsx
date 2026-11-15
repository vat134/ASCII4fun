import { useLayoutEffect, useRef, useState } from "react";
import { ImageWorkspace } from "../images/image-workspace";
import type { ImageConfiguration } from "../images/image-conversion";
import { TextWorkspace } from "../figlet/text-workspace";
import { CompactWorkspace } from "../compact/compact-workspace";
import type { WorkspaceMode } from "./ascii-type";

export function ConversionWorkspace({
  configuration
}: {
  configuration: ImageConfiguration;
}) {
  const [mode, setMode] = useState<WorkspaceMode>("media");
  const [opened, setOpened] = useState<WorkspaceMode[]>(["media"]);
  function changeMode(next: WorkspaceMode) {
    setOpened((previous) =>
      previous.includes(next) ? previous : [...previous, next]
    );
    setMode(next);
  }
  const root = useRef<HTMLDivElement>(null);
  const previousMode = useRef(mode);
  useLayoutEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    root.current
      ?.querySelector<HTMLElement>(
        `[data-workspace="${mode}"] [role="tab"][aria-selected="true"]`
      )
      ?.focus();
  }, [mode]);

  return (
    <div ref={root} className="flex min-h-0 flex-1 flex-col">
      <div
        data-workspace="media"
        hidden={mode !== "media"}
        className={mode === "media" ? "flex min-h-0 flex-1 flex-col" : "hidden"}
      >
        <ImageWorkspace
          active={mode === "media"}
          configuration={configuration}
          onModeChange={changeMode}
        />
      </div>
      {opened.includes("text") && (
        <div
          data-workspace="text"
          hidden={mode !== "text"}
          className={
            mode === "text" ? "flex min-h-0 flex-1 flex-col" : "hidden"
          }
        >
          <TextWorkspace active={mode === "text"} onModeChange={changeMode} />
        </div>
      )}
      {opened.includes("mini-art") && (
        <div
          data-workspace="mini-art"
          hidden={mode !== "mini-art"}
          className={
            mode === "mini-art" ? "flex min-h-0 flex-1 flex-col" : "hidden"
          }
        >
          <CompactWorkspace
            active={mode === "mini-art"}
            maxEncodedBytes={configuration.maxEncodedBytes}
            onModeChange={changeMode}
          />
        </div>
      )}
    </div>
  );
}
