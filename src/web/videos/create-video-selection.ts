import { BrowserVideoClient } from "./browser-video-client";
import { prepareVideo } from "./prepare-video";

export async function createVideoSelection(
  file: File,
  requestToken: string,
  signal: AbortSignal
) {
  const prepared = await prepareVideo(file, requestToken, signal);
  signal.throwIfAborted();
  const url = URL.createObjectURL(prepared.file);
  try {
    const client = new BrowserVideoClient(url, prepared.metadata);
    return {
      selection: { file: prepared.file, url, clock: client.clock },
      client
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
