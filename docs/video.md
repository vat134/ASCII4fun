# Short video

Media accepts MP4/MOV with H.264 or HEVC and WebM with VP8 or VP9. Limits: 60 seconds, 100 MiB encoded, 1,920 pixels per side and 2,073,600 pixels per frame, 60 FPS and 3,600 source frames. Longer clips fail explicitly; they are not trimmed or downscaled automatically. Odd source dimensions are padded to even dimensions for H.264. Source metadata and actual codec decoding are validated independently.

Admission decodes the selected video stream to inspect its frame timestamps and durations; declared container duration, frame count and average FPS are not authoritative. The selected frame span defines duration and average cadence, independently of audio padding or a longer audio track. The probe stops at the first exceeded duration/frame bound and caps metadata records at 512 characters and total output at 1 MiB. This adds decoding work to admission; it is not a wall-clock or total-memory guarantee. Preparation and export seek to the same source video origin for both video and audio. Export requires the normalized decoder to produce exactly the admitted frame count.

## Setup

Video requires external `ffmpeg` and `ffprobe` executables, with H.264 (`libx264`), HEVC, VP8/VP9 and AAC support. The repository does not bundle them. Local verification covers FFmpeg 6.1.1 and 8.0.1 on Linux and 9.0.2, Gyan essentials (GPLv3), on Windows; install an appropriate build from the [FFmpeg download page](https://ffmpeg.org/download.html) and retain its notices when distributing it. Still images, GIF and Text do not require these tools.

By default both tools are resolved from PATH. The .NET server also accepts `Video:FfmpegPath` and `Video:FfprobePath` configuration, including standard environment names `Video__FfmpegPath` / `Video__FfprobePath`. The development launcher loads these from `.env.local`; see `.env.example`. CLI callers can pass `--ffmpeg-path` and `--ffprobe-path`. Package callers pass `VideoTools`.

## Editor

The browser sends the source to the local server once for H.264/AAC preparation, including orientation and constant source-average cadence. The prepared clip remains in browser memory and is sent again on export. Play/pause, seeking and speed use the audio clock; a separate paused decoder provides frame pixels to the shared C# conversion worker. Slow conversion skips overdue preview frames. Changing Columns, characters or tone does not pause sound or playback.

The FPS slider is capped at the prepared source average; Original retains every source frame at the selected speed. Lower FPS changes cadence without changing duration. Speed changes both audio and video duration, preserving audio pitch. Mute affects listening only; MP4 export still contains source audio. Silent sources remain silent. Only the first audio track is retained; other tracks and subtitles are not exported.

MP4 uses the same C# character conversion and rasterizer as preview, followed by H.264/AAC encoding (CRF 14, 192 kbit/s audio). Preparation and MP4 encoding are lossy; exact decoded MP4 pixels are not a PNG equality contract. Browser/native video decoders may differ slightly in color rounding. All video frames use fixed full-range linear luminance bounds instead of independently stretching each frame. This avoids tone pumping without retaining/scanning every video frame per slider change. PNG, TXT and Copy text capture the completed displayed frame when clicked.

## CLI and package

```powershell
dotnet run --project src/cli -- convert-video clip.mp4 --output ascii.mp4 --width 80 --invert --source-colors --speed 2 --fps 10
```

`convert-video` exposes the same Columns/ramp, invert, colors, tone and photo controls as `convert-gif`. Output is MP4; existing files are not overwritten. Progress is written to stderr. The package exposes `VideoClip.OpenAsync`, `PrepareAsync`, `ExportAsync`, `Metadata` and asynchronous disposal. `VideoTimeline.Create` is the shared C#/WASM source-time calculation; it does not use GIF's centisecond rounding.

## HTTP

Both multipart endpoints accept `image` and require the existing `X-CSRF-TOKEN` obtained from `/api/images/options`. They share one active conversion, no queue, no-store responses and a fifteen-minute request timeout.

- `POST /api/videos/prepare`: returns `video/mp4` and an `X-Video-Metadata` JSON header with `widthInPixels`, `heightInPixels`, `durationMs`, `framesPerSecond`, `frameCount`, `hasAudio` for the actual prepared clip.
- `POST /api/videos/convert`: additionally accepts `settings` JSON with `options` and `playback`, like GIF. Returns `video/mp4`, or NDJSON with `Accept: application/x-ndjson`: progress counts, then `{ "type": "complete", "video": "base64..." }`, or a terminal error message.

Errors use Problem Details (400 invalid settings/size, 415 content type, 422 invalid/unsupported clip, 429 busy). A streamed conversion reports codec/settings failure as a terminal error event. Export is capped at 100 MiB, four minutes of output at minimum speed, and at most 14,400 output frames. Rendering streams one frame at a time; no full raster collection or persistent job is created. Encoded upload/response buffers remain bounded in memory. Temporary files are request-owned and deleted after success, failure or cancellation; child codecs are killed and joined before cleanup. Input protocols and demuxers are allow-listed and individual codec allocations/source pixel counts are bounded; these are admission policies, not a total process RAM cap.

## Fixtures and evidence

`tests/ascii4fun-tests/fixtures/video-*` are authored using FFmpeg `testsrc2` and a 440 Hz sine wave, plus silent one-minute/61-second solid-color clips. They contain no external footage. Native/API tests cover supported containers, sound, retiming, errors and cancellation/retry. Chrome tests exercise upload, live playback, keyboard seek/FPS and download. Headless test output is muted through Chrome's `--mute-audio`, without changing application sound or exported audio. Local measurements and learning evidence live in the project delivery plan.

Preparation keeps video normalization and audio alignment in one [complex filtergraph](https://ffmpeg.org/ffmpeg.html#Complex-filtergraphs) when audio exists. With separate `-vf` and `-af` graphs, FFmpeg 8.0.1 hangs on the delayed-audio fixture while using `fps` and `apad`; the same fixture finishes with the combined graph and retains its expected frame count, duration and sound windows. Bounding `apad` alone did not resolve the reproduced hang. Silent clips keep the same video filter without an audio branch. The synchronization regression cancels preparation/export after 30 seconds; Ubuntu CI also collects VSTest hang diagnostics after two minutes, with a five-minute test-step limit.
