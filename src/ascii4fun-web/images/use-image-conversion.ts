import { useEffect, useState } from "react";
import {
  convertImage,
  type AsciiText,
  type CharacterImageOptions,
  type ImageConfiguration
} from "./image-conversion";

type SelectedImage = { file: File; url: string };
type ConversionState =
  | { status: "empty" }
  | { status: "pending"; result: AsciiText | null }
  | { status: "ready"; result: AsciiText }
  | { status: "error"; message: string };

// Coalesce slider and typing changes before sending CPU-heavy work to the server.
const previewDebounceMs = 200;

export function useImageConversion(configuration: ImageConfiguration) {
  const [selection, setSelection] = useState<SelectedImage | null>(null);
  const [options, setOptions] = useState<CharacterImageOptions>({
    outputWidthInCells: configuration.defaultOutputWidthInCells,
    characterRamp: configuration.defaultCharacterRamp,
    invert: true
  });
  const [state, setState] = useState<ConversionState>({ status: "empty" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!selection) return;
    return () => URL.revokeObjectURL(selection.url);
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await convertImage(
          selection.file,
          options,
          configuration.requestToken,
          controller.signal
        );
        if (!controller.signal.aborted) setState({ status: "ready", result });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Conversion failed. Please retry."
          });
        }
      }
    }, previewDebounceMs);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selection, options, configuration.requestToken, retryCount]);

  function selectImage(file: File) {
    if (file.size === 0 || file.size > configuration.maxEncodedBytes) {
      setSelection(null);
      setState({
        status: "error",
        message: "Choose a non-empty image within the upload limit."
      });
      return;
    }
    setSelection({ file, url: URL.createObjectURL(file) });
    setState({ status: "pending", result: null });
  }

  function changeOptions(next: CharacterImageOptions) {
    setOptions(next);
    if (selection) {
      setState((current) => ({
        status: "pending",
        result: "result" in current ? current.result : null
      }));
    }
  }

  function retry() {
    setState({ status: "pending", result: null });
    setRetryCount((count) => count + 1);
  }

  function clear() {
    setSelection(null);
    setState({ status: "empty" });
  }

  return {
    selection,
    options,
    state,
    selectImage,
    changeOptions,
    clear,
    retry
  };
}
