type ExportEvent =
  | { type: "progress"; completedFrames: number }
  | { type: "complete"; gif?: string; video?: string }
  | { type: "error"; message: string };

export async function readAnimationExport(
  response: Response,
  format: "gif" | "mp4",
  signal: AbortSignal,
  progress: (count: number) => void
) {
  const label = format.toUpperCase();
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const problem = contentType.includes("json")
      ? ((await response.json()) as { detail?: string })
      : null;
    throw new Error(
      problem?.detail ??
        `${label} export failed (HTTP ${response.status}). Refresh the page and retry.`
    );
  }
  if (!contentType.includes("application/x-ndjson"))
    throw new Error(
      `${label} export returned an unexpected response. Refresh the page and retry.`
    );
  if (!response.body) throw new Error(`${label} export returned no data.`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let completed: Uint8Array<ArrayBuffer> | null = null;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += chunk.value;
      if (buffer.length > (format === "gif" ? 90 : 140) * 1024 * 1024)
        throw new Error(`${label} export exceeds the download limit.`);
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const event = JSON.parse(buffer.slice(0, newline)) as ExportEvent;
        buffer = buffer.slice(newline + 1);
        if (event.type === "progress") progress(event.completedFrames);
        else if (event.type === "error") throw new Error(event.message);
        else if (event.type === "complete") {
          signal.throwIfAborted();
          const encoded = format === "gif" ? event.gif : event.video;
          if (!encoded || completed)
            throw new Error(`${label} export returned invalid media.`);
          completed = Uint8Array.from(atob(encoded), (character) =>
            character.charCodeAt(0)
          );
        }
        newline = buffer.indexOf("\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!completed)
    throw new Error(`${label} export was interrupted. Retry the download.`);
  return completed;
}
