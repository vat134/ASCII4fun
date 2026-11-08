import { useEffect, useRef, useState } from "react";
import type { SelectedImage } from "./use-image-conversion";

/** A static source thumbnail prevents a second, uncontrollable GIF animation. */
export function SourceThumbnail({ selection }: { selection: SelectedImage }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    void createImageBitmap(selection.file)
      .then((bitmap) => {
        const target = canvas.current;
        if (!disposed && target) {
          const scale = Math.min(
            1,
            256 / Math.max(bitmap.width, bitmap.height)
          );
          target.width = Math.max(1, Math.round(bitmap.width * scale));
          target.height = Math.max(1, Math.round(bitmap.height * scale));
          target
            .getContext("2d")
            ?.drawImage(bitmap, 0, 0, target.width, target.height);
        }
        bitmap.close();
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
    };
  }, [selection]);
  if (failed)
    return (
      <p className="text-xs text-muted-foreground">
        Source thumbnail unavailable.
      </p>
    );
  return (
    <div role="img" aria-label="Uploaded source thumbnail">
      <canvas
        ref={canvas}
        aria-hidden="true"
        className="max-h-64 w-full rounded-md bg-muted object-contain"
      />
    </div>
  );
}
