import type { CSSProperties } from "react";

const frames = ["|", "/", "-", "\\"];

export function AsciiSpinner() {
  return (
    <span
      aria-hidden="true"
      className="ascii-spinner inline-block size-5 shrink-0 overflow-hidden align-middle font-mono"
      style={{ "--spinner-frame-count": frames.length } as CSSProperties}
    >
      <span className="grid">
        {frames.map((frame) => (
          <span key={frame} className="grid size-5 place-items-center">
            {frame}
          </span>
        ))}
      </span>
    </span>
  );
}
