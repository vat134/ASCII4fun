import type { components, operations } from "../api/generated/http-api";

type ExportEvent =
  | operations["ConvertAnimation"]["responses"][200]["content"]["application/x-ndjson"]
  | operations["ConvertVideo"]["responses"][200]["content"]["application/x-ndjson"];

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
      ? ((await response.json()) as components["schemas"]["ProblemDetails"])
      : null;
    throw new Error(
      problem?.detail ??
        `${label} export failed (HTTP ${response.status}). Refresh the page and retry.`
    );
  }
  if (
    contentType.split(";", 1)[0]?.trim().toLowerCase() !==
    "application/x-ndjson"
  )
    throw new Error(
      `${label} export returned an unexpected response. Refresh the page and retry.`
    );
  if (!response.body) throw new Error(`${label} export returned no data.`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let completed: Uint8Array<ArrayBuffer> | null = null;
  const invalidResponse = () =>
    new Error(`${label} export returned an invalid server response.`);
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      buffer += chunk.value;
      if (buffer.length > (format === "gif" ? 90 : 140) * 1024 * 1024)
        throw new Error(`${label} export exceeds the download limit.`);
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const value: unknown = JSON.parse(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (completed) throw invalidResponse();
        const event = parseEvent(value, format, invalidResponse);
        if (event.type === "progress") {
          progress(event.completedFrames);
        } else if (event.type === "error") {
          throw new Error(event.message);
        } else if (event.type === "complete") {
          signal.throwIfAborted();
          const encoded =
            format === "gif"
              ? "gif" in event && event.gif
              : "video" in event && event.video;
          if (typeof encoded !== "string" || !encoded)
            throw new Error(`${label} export returned invalid media.`);
          completed = Uint8Array.from(atob(encoded), (character) =>
            character.charCodeAt(0)
          );
        } else throw invalidResponse();
        newline = buffer.indexOf("\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (buffer.trim()) throw invalidResponse();
  if (!completed)
    throw new Error(`${label} export was interrupted. Retry the download.`);
  return completed;
}
function parseEvent(
  value: unknown,
  format: "gif" | "mp4",
  invalid: () => Error
): ExportEvent {
  if (!value || typeof value !== "object" || !("type" in value))
    throw invalid();
  if (value.type === "progress") {
    if (
      !("completedFrames" in value) ||
      typeof value.completedFrames !== "number" ||
      !Number.isSafeInteger(value.completedFrames) ||
      value.completedFrames < 0
    )
      throw invalid();
    return { type: value.type, completedFrames: value.completedFrames };
  }
  if (value.type === "error") {
    if (!("message" in value) || typeof value.message !== "string")
      throw invalid();
    return { type: value.type, message: value.message };
  }
  if (value.type === "complete") {
    if (format === "gif" && "gif" in value && typeof value.gif === "string")
      return { type: value.type, gif: value.gif };
    if (format === "mp4" && "video" in value && typeof value.video === "string")
      return { type: value.type, video: value.video };
    throw new Error(`${format.toUpperCase()} export returned invalid media.`);
  }
  throw invalid();
}
