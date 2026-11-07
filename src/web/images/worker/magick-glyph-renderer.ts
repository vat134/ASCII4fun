import {
  Drawables,
  ImageMagick,
  Magick,
  MagickColors
} from "@imagemagick/magick-wasm";

const fonts = new Map<string, Promise<void>>();
export async function loadFonts(names: string[]) {
  await Promise.all(
    Array.from(names, (name) => {
      let pending = fonts.get(name);
      if (!pending) {
        pending = fetch(`/engine-runtime/fonts/${name}`).then(
          async (response) => {
            if (!response.ok)
              throw new Error(`Cannot load the bundled font ${name}.`);
            Magick.addFont(name, new Uint8Array(await response.arrayBuffer()));
          }
        );
        fonts.set(name, pending);
        pending.catch(() => fonts.delete(name));
      }
      return pending;
    })
  );
}

export function renderMask(
  font: string,
  pointSize: number,
  baseline: number,
  glyph: string,
  width: number,
  height: number
): Uint8Array {
  const drawing = new Drawables()
    .font(font)
    .fontPointSize(pointSize)
    .fillColor(MagickColors.White)
    .strokeColor(MagickColors.None);
  const metrics = drawing.fontTypeMetrics(glyph);
  if (!metrics)
    throw new Error("The bundled font did not provide glyph metrics.");
  return ImageMagick.read(MagickColors.Transparent, width, height, (tile) => {
    drawing
      .affine(
        metrics.textWidth > 0 ? width / metrics.textWidth : 1,
        1,
        0,
        0,
        0,
        0
      )
      .text(0, baseline, glyph)
      .draw(tile);
    const rgba = tile.getPixels((pixels) =>
      pixels.toByteArray(0, 0, width, height, "RGBA")
    );
    if (!rgba)
      throw new Error("The glyph renderer did not expose RGBA pixels.");
    const mask = new Uint8Array(width * height);
    for (let index = 0; index < mask.length; index++)
      mask[index] = rgba[index * 4 + 3]!;
    return mask;
  });
}
