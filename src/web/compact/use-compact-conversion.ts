import { useEffect, useRef, useState } from "react";
import type { CompactArtOptions } from "./compact-types";
import {
  CompactPreviewSession,
  type CompactPreviewState
} from "./compact-preview-session";

const idle: CompactPreviewState = { status: "idle", result: null, error: null };

export function useCompactConversion(
  defaultOptions: CompactArtOptions,
  maxEncodedBytes: number,
  active: boolean
) {
  const [options, setOptions] = useState(defaultOptions);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [state, setState] = useState<CompactPreviewState>(idle);
  const [attempt, setAttempt] = useState(0);
  const latestOptions = useRef(defaultOptions);
  const session = useRef<CompactPreviewSession | null>(null);
  const currentUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    },
    []
  );

  useEffect(() => {
    if (!file || !active) return;
    const current = new CompactPreviewSession(file, setState);
    session.current = current;
    current.request(latestOptions.current);
    return () => {
      session.current = null;
      current.dispose();
    };
  }, [file, active, attempt]);

  function changeOptions(next: CompactArtOptions) {
    latestOptions.current = next;
    setOptions(next);
    if (file)
      setState((previous) => ({ ...previous, status: "pending", error: null }));
    session.current?.request(next);
  }

  function selectFile(next: File) {
    session.current?.dispose();
    session.current = null;
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = null;
    setFile(null);
    setSourceUrl(null);
    if (next.size > maxEncodedBytes) {
      setState({
        status: "error",
        result: null,
        error: `Choose an image smaller than ${Math.floor(maxEncodedBytes / 1024 / 1024)} MB.`
      });
      return;
    }
    setFile(next);
    const url = URL.createObjectURL(next);
    currentUrl.current = url;
    setSourceUrl(url);
    setAttempt((value) => value + 1);
    setState({ status: "pending", result: null, error: null });
  }

  function clear() {
    session.current?.dispose();
    session.current = null;
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = null;
    setFile(null);
    setSourceUrl(null);
    setState(idle);
  }

  function retry() {
    setState((previous) => ({ ...previous, status: "pending", error: null }));
    setAttempt((value) => value + 1);
  }

  return {
    options,
    file,
    sourceUrl,
    state,
    changeOptions,
    selectFile,
    clear,
    retry
  };
}
