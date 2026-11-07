import {
  FilterType,
  MagickGeometry,
  type IMagickImage
} from "@imagemagick/magick-wasm";

export function sampleRgbaImage(
  source: IMagickImage,
  widthInPixels: number,
  heightInPixels: number
): Uint8Array {
  const rgba = source.clone((image) => {
    const geometry = new MagickGeometry(widthInPixels, heightInPixels);
    geometry.ignoreAspectRatio = true;
    image.resize(geometry, FilterType.Box);
    return image.getPixels((pixels) =>
      pixels.toByteArray(0, 0, widthInPixels, heightInPixels, "RGBA")
    );
  });
  if (!rgba) throw new Error("The decoded image did not expose RGBA pixels.");
  return rgba;
}
