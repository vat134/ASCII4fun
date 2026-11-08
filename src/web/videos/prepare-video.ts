export type VideoMetadata = {
  widthInPixels: number;
  heightInPixels: number;
  durationMs: number;
  framesPerSecond: number;
  hasAudio: boolean;
  frameCount: number;
};

export function isVideo(file: File) {
  return (
    file.type.startsWith("video/") || /\.(?:mp4|webm|mov)$/iu.test(file.name)
  );
}

export async function prepareVideo(
  file: File,
  requestToken: string,
  signal: AbortSignal
) {
  const body = new FormData();
  body.set("image", file);
  const response = await fetch("/api/videos/prepare", {
    method: "POST",
    body,
    headers: { "X-CSRF-TOKEN": requestToken },
    signal
  });
  if (!response.ok) {
    const problem = response.headers.get("content-type")?.includes("json")
      ? ((await response.json()) as { detail?: string })
      : null;
    throw new Error(
      problem?.detail ??
        `Video preparation failed (HTTP ${response.status}). Retry when the local server is running.`
    );
  }
  const header = response.headers.get("X-Video-Metadata");
  if (!response.headers.get("content-type")?.includes("video/mp4") || !header)
    throw new Error("Video preparation returned an unexpected response.");
  const metadata = JSON.parse(header) as VideoMetadata;
  const blob = await response.blob();
  signal.throwIfAborted();
  return {
    file: new File([blob], file.name.replace(/\.[^.]+$/u, "") + ".mp4", {
      type: "video/mp4"
    }),
    metadata
  };
}
