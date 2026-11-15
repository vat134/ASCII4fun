// Test oracle only: run against the pinned MIT Typist checkout, never in the product.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const reference = resolve(
  process.argv[2] ?? "artifacts/reference-reviews/typist"
);
for (const [file, expected] of Object.entries({
  "tone.js": "a49a89f3fac49872b9fee5befe66c044c625f86a2f87e4915bf36a95afefcf90",
  "dither.js":
    "c543258d550ac22bd90b154de9cce06004978cfcdbb5bf0ec376beb25d1faa79"
})) {
  const actual = createHash("sha256")
    .update(await readFile(resolve(reference, "js", file)))
    .digest("hex");
  if (actual !== expected)
    throw new Error(
      `Expected pinned Typist f128e782 ${file}; received ${actual}`
    );
}
const { toneGrid, decodeSource, sampleDecoded } = await import(
  pathToFileURL(resolve(reference, "js/tone.js"))
);
const { ditherDots, encodeBraille } = await import(
  pathToFileURL(resolve(reference, "js/dither.js"))
);
const cases = [];
for (const columns of [8, 24, 48]) {
  const width = columns * 2,
    height = Math.round(columns * 0.54) * 4;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const subject =
        ((x / width - 0.5) / 0.32) ** 2 + ((y / height - 0.5) / 0.4) ** 2 < 1;
      const value = subject
        ? 25 + ((x * 17 + y * 31) % 190)
        : 210 + Math.floor((y / height) * 20);
      rgba.set(
        [value, Math.min(255, value + 9), Math.max(0, value - 13), 255],
        i
      );
    }
  for (const look of ["photo", "texture", "sketch", "soft", "poster"])
    for (const [index, controls] of [
      {},
      { invert: false },
      { brightness: 0.25, contrast: -0.3, gamma: 2.92, detail: 1 },
      { brightness: -0.2, contrast: 0.4, gamma: 0.6, edges: 0.75 },
      { auto: false, brightness: 0.2, contrast: -0.8, gamma: 1.8, detail: 0 },
      {
        auto: false,
        invert: false,
        brightness: -0.4,
        contrast: 0.3,
        gamma: 0.75,
        detail: 0.8
      }
    ].entries()) {
      const tone = { look, invert: true, ...controls };
      const luma = Float32Array.from(
        { length: width * height },
        (_, i) =>
          (0.2126 * rgba[i * 4] +
            0.7152 * rgba[i * 4 + 1] +
            0.0722 * rgba[i * 4 + 2]) /
          255
      );
      const output = toneGrid({ W: width, H: height, L: luma, A: null }, tone, {
        target: 0.4,
        boost: Math.max(0, Math.min(1, (36 - columns) / 20))
      });
      const text = {};
      for (const dither of ["atkinson", "floyd", "bayer", "threshold"]) {
        const grid = encodeBraille(
          ditherDots(output, width, height, dither, {
            edge: output.edge,
            edges: tone.edges ?? 0
          }),
          width,
          height
        );
        text[dither] = Array.from({ length: grid.rows }, (_, row) =>
          String.fromCodePoint(
            ...grid.cp.slice(row * columns, (row + 1) * columns)
          )
        ).join("\n");
      }
      cases.push({
        name: `${look}-${columns}-columns-controls-${index}`,
        look,
        width,
        height,
        rgba: Buffer.from(rgba).toString("base64"),
        controls,
        lightness: [...output],
        text
      });
    }
}
const samplingCases = [];
for (const [width, height, transparent] of [
  [1111, 37, false],
  [108, 132, true]
]) {
  const rgba = Uint8Array.from({ length: width * height * 4 }, (_, i) =>
    i % 4 === 3
      ? transparent
        ? (Math.floor(i / 4) * 17) % 256
        : 255
      : (i * 31 + Math.floor(i / 19)) % 256
  );
  const decoded = decodeSource({ width, height, data: rgba });
  for (const crop of [
    { x: 0.5, y: 0.5, zoom: 1 },
    { x: 0.13, y: 0.8, zoom: 1.27 }
  ]) {
    const columns = 24,
      rows = 13;
    const sampled = sampleDecoded(decoded, crop, columns * 2, rows * 4);
    const toned = [];
    for (const look of ["photo", "texture", "sketch", "soft", "poster"])
      for (const invert of [false, true])
        toned.push({
          look,
          invert,
          lightness: [
            ...toneGrid(sampled, { look, invert }, { target: 0.4, boost: 0.6 })
          ]
        });
    samplingCases.push({
      width,
      height,
      rgba: Buffer.from(rgba).toString("base64"),
      crop,
      lightness: [...sampled.L],
      alpha: sampled.A ? [...sampled.A] : null,
      toned
    });
  }
}
const sha256 = createHash("sha256")
  .update(await readFile(resolve(reference, "js/tone.js")))
  .digest("hex");
await writeFile(
  "tests/ascii4fun-tests/fixtures/compact-reference.json.gz",
  gzipSync(
    JSON.stringify({
      revision: "f128e782e33de2dcb013eb572a02e236851cc662",
      sha256,
      cases,
      samplingCases
    }),
    { level: 9 }
  )
);
