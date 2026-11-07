import { useRef, useState } from "react";
import type { ImageConversionResult } from "./image-conversion";
import { exportPreviewPng } from "./export-preview-png";

export function useImageDownload(
  result: ImageConversionResult | null,
  sourceName: string | undefined
) {
  const active = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(format: "txt" | "png") {
    if (!result || !sourceName || active.current) return;
    active.current = true;
    setBusy(true);
    setError(null);
    try {
      // Capture the clicked result; a later edit must not change an export already in progress.
      const name = `${sourceName.replace(/\.[^.]+$/u, "")}.${format}`;
      const blob =
        format === "png"
          ? await exportPreviewPng(result)
          : new Blob([result.text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The artwork could not be downloaded. Retry the export."
      );
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return { download, busy, error };
}
