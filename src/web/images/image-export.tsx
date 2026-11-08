import { ArtworkExport } from "../rendering/artwork-export";
import { useArtworkDownload } from "../rendering/use-artwork-download";
import { AnimationExport } from "../animations/animation-export";
import { useAnimationDownload } from "../animations/use-animation-download";
import { isVideo } from "../videos/prepare-video";
import type { AnimationPlaybackOptions } from "../animations/animation-conversion";
import type {
  CharacterImageOptions,
  ImageConversionResult
} from "./image-conversion";

export function ImageExport({
  result,
  canExportGif,
  isAnimation,
  file,
  options,
  playback,
  requestToken,
  dimensions
}: {
  result: ImageConversionResult | null;
  canExportGif: boolean;
  isAnimation: boolean;
  file: File | undefined;
  options: CharacterImageOptions;
  playback: AnimationPlaybackOptions;
  requestToken: string;
  dimensions: string;
}) {
  const artwork = useArtworkDownload(result, file?.name);
  const format = file && isVideo(file) ? "mp4" : "gif";
  const animation = useAnimationDownload(
    file,
    options,
    playback,
    requestToken,
    format
  );
  return isAnimation ? (
    <AnimationExport
      format={format}
      exporter={animation}
      canExport={result !== null}
      canExportGif={canExportGif}
      onPng={() => void artwork.download("png")}
      onTxt={() => void artwork.download("txt")}
      frameBusy={artwork.busy}
      frameError={artwork.error}
    />
  ) : (
    <ArtworkExport
      canExport={result !== null && !artwork.busy}
      error={artwork.error}
      onExport={artwork.download}
      dimensions={dimensions}
    />
  );
}
