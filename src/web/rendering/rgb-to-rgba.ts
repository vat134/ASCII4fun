export function rgbToRgba(rgb: Uint8Array): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray((rgb.length / 3) * 4);
  for (let input = 0, output = 0; input < rgb.length; input += 3, output += 4) {
    pixels[output] = rgb[input]!;
    pixels[output + 1] = rgb[input + 1]!;
    pixels[output + 2] = rgb[input + 2]!;
    pixels[output + 3] = 255;
  }
  return pixels;
}
