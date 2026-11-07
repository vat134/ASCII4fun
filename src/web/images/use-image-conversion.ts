import { useEffect, useRef, useState } from "react";
import {
  createDefaultImageOptions,
  type CharacterImageOptions,
  type ImageConfiguration
} from "./image-conversion";
import {
  ImagePreviewSession,
  type ConversionState
} from "./image-preview-session";

export type SelectedImage = { file: File; url: string };

export function useImageConversion(configuration: ImageConfiguration) {
  const [selection, setSelection] = useState<SelectedImage | null>(null);
  const [options, setOptions] = useState(() =>
    createDefaultImageOptions(configuration)
  );
  const [state, setState] = useState<ConversionState>({ status: "empty" });
  const session = useRef<ImagePreviewSession | null>(null);
  const sourceUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      session.current?.dispose();
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    },
    []
  );

  function clear() {
    void session.current?.dispose();
    session.current = null;
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    sourceUrl.current = null;
    setSelection(null);
    setState({ status: "empty" });
  }

  function selectImage(file: File) {
    clear();
    if (file.size === 0 || file.size > configuration.maxEncodedBytes) {
      setState({
        status: "error",
        message: "Choose a non-empty image within the upload limit."
      });
      return;
    }
    sourceUrl.current = URL.createObjectURL(file);
    setSelection({ file, url: sourceUrl.current });
    session.current = new ImagePreviewSession(file, setState);
    session.current.request(options);
  }

  function changeOptions(next: CharacterImageOptions) {
    setOptions(next);
    session.current?.request(next);
  }

  function retry() {
    if (selection) selectImage(selection.file);
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
