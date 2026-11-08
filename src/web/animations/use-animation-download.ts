import { useEffect, useRef, useState } from "react";
import type { CharacterImageOptions } from "../images/image-conversion";
import type { AnimationPlaybackOptions } from "./animation-conversion";
import { readAnimationExport } from "./read-animation-export";

export function useAnimationDownload(
  file: File | undefined,
  options: CharacterImageOptions,
  playback: AnimationPlaybackOptions,
  requestToken: string,
  format: "gif" | "mp4"
) {
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [completedFrames, setCompletedFrames] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => controller.current?.abort(), [file]);

  async function download() {
    if (!file || controller.current) return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setCompletedFrames(0);
    setError(null);
    try {
      const body = new FormData();
      body.set("image", file);
      body.set("settings", JSON.stringify({ options, playback }));
      const response = await fetch(
        format === "gif" ? "/api/animations/convert" : "/api/videos/convert",
        {
          method: "POST",
          body,
          headers: {
            "X-CSRF-TOKEN": requestToken,
            Accept: "application/x-ndjson"
          },
          signal: active.signal
        }
      );
      const bytes = await readAnimationExport(
        response,
        format,
        active.signal,
        setCompletedFrames
      );
      active.signal.throwIfAborted();
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: format === "gif" ? "image/gif" : "video/mp4"
        })
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name.replace(/\.[^.]+$/u, "") + "." + format;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (failure) {
      active.abort();
      if (!(failure instanceof DOMException && failure.name === "AbortError"))
        setError(
          failure instanceof SyntaxError
            ? `${format.toUpperCase()} export returned an invalid server response. Refresh the page and retry.`
            : failure instanceof Error
              ? failure.message
              : "Animation export failed."
        );
    } finally {
      if (controller.current === active) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  return {
    download,
    busy,
    completedFrames,
    error,
    cancel: () => controller.current?.abort()
  };
}
