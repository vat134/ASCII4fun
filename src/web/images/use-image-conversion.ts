import { useCallback, useEffect, useRef, useState } from "react";
import { useAnimationPlayback } from "../animations/use-animation-playback";
import type { AnimationPlaybackOptions } from "../animations/animation-conversion";
import { createVideoSelection } from "../videos/create-video-selection";
import { isVideo } from "../videos/prepare-video";
import {
  createDefaultImageOptions,
  type CharacterImageOptions,
  type ImageConfiguration
} from "./image-conversion";
import {
  ImagePreviewSession,
  type ConversionState
} from "./image-preview-session";

export type SelectedImage = {
  file: File;
  url: string;
  clock?: { current: HTMLAudioElement };
};

export function useImageConversion(
  configuration: ImageConfiguration,
  active = true
) {
  const [selection, setSelection] = useState<SelectedImage | null>(null);
  const [options, setOptions] = useState(() =>
    createDefaultImageOptions(configuration)
  );
  const [state, setState] = useState<ConversionState>({ status: "empty" });
  const session = useRef<ImagePreviewSession | null>(null);
  const sourceUrl = useRef<string | null>(null);
  const preparation = useRef<AbortController | null>(null);
  const currentOptions = useRef(options);
  const result = "result" in state ? state.result : null;
  const requestFrame = useCallback(
    (frameIndex: number, playback: AnimationPlaybackOptions) => {
      session.current?.request(options, frameIndex, playback);
    },
    [options]
  );
  const playback = useAnimationPlayback(
    result?.animation,
    requestFrame,
    active,
    selection?.clock
  );

  useEffect(
    () => () => {
      session.current?.dispose();
      preparation.current?.abort();
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    },
    []
  );

  function clear() {
    preparation.current?.abort();
    preparation.current = null;
    playback.reset();
    void session.current?.dispose();
    session.current = null;
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    sourceUrl.current = null;
    setSelection(null);
    setState({ status: "empty" });
  }

  function selectImage(file: File) {
    clear();
    const video = isVideo(file);
    if (
      file.size === 0 ||
      file.size > (video ? 100 * 1024 * 1024 : configuration.maxEncodedBytes)
    ) {
      setState({
        status: "error",
        message:
          "Choose non-empty media within the upload limit (video: 100 MiB)."
      });
      return;
    }
    sourceUrl.current = URL.createObjectURL(file);
    setSelection({ file, url: sourceUrl.current });
    if (!video) {
      session.current = new ImagePreviewSession(file, setState);
      session.current.request(currentOptions.current);
      return;
    }
    playback.reset(false);
    setState({ status: "pending", result: null });
    const controller = new AbortController();
    preparation.current = controller;
    void createVideoSelection(
      file,
      configuration.requestToken,
      controller.signal
    )
      .then((prepared) => {
        if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
        sourceUrl.current = prepared.selection.url;
        setSelection(prepared.selection);
        session.current = new ImagePreviewSession(
          prepared.selection.file,
          setState,
          prepared.client
        );
        session.current.request(currentOptions.current);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Video preparation failed."
          });
      });
  }

  function changeOptions(next: CharacterImageOptions) {
    currentOptions.current = next;
    setOptions(next);
    session.current?.request(
      next,
      playback.currentFrame(),
      result?.animation ? playback.options : undefined
    );
  }

  function retry() {
    if (selection) selectImage(selection.file);
  }

  return {
    selection,
    options,
    state,
    playback,
    selectImage,
    changeOptions,
    clear,
    retry
  };
}
