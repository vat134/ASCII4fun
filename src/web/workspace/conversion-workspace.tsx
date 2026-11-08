import { useLayoutEffect, useRef, useState } from "react";
import { ImageWorkspace } from "../images/image-workspace";
import type { ImageConfiguration } from "../images/image-conversion";
import { TextWorkspace } from "../figlet/text-workspace";

export function ConversionWorkspace({
  configuration
}: {
  configuration: ImageConfiguration;
}) {
  const [mode, setMode] = useState<"media" | "text">("media");
  const [textOpened, setTextOpened] = useState(false);
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
          configuration={configuration}
          onTextMode={() => {
            setTextOpened(true);
            setMode("text");
          }}
        />
      </div>
      {textOpened && (
        <div
          data-workspace="text"
          hidden={mode !== "text"}
          className={
            mode === "text" ? "flex min-h-0 flex-1 flex-col" : "hidden"
          }
        >
          <TextWorkspace
            active={mode === "text"}
            onMediaMode={() => setMode("media")}
          />
        </div>
      )}
    </div>
  );
}
