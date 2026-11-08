export const imageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEUlEQVR4nGNgAIP/YMCAzAEAd6IL9cTZu14AAAAASUVORK5CYII=";
export const transparentImageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAGklEQVR4nGP4z8DwHwwZ/jcwMDAwMIEIZAAAlrgFfp5ub54AAAAASUVORK5CYII=";

export function uploadImage(contents = imageBase64, name = "source.png") {
  cy.get("#image-upload").selectFile(
    {
      contents: Cypress.Buffer.from(contents, "base64"),
      fileName: name,
      mimeType: "image/png"
    },
    { force: true }
  );
}
export function ready(columns = 80) {
  cy.contains("button", "Download PNG", { timeout: 30000 }).should(
    "be.enabled"
  );
  cy.get('canvas[role="img"]')
    .should("have.attr", "aria-label")
    .and("include", `${columns} columns`);
}
export function columns(value: number) {
  cy.get("#grid-columns").clear().type(`${value}{enter}`);
  ready(value);
}
export function previewPixels(win: Window): ImageData {
  const canvas =
    win.document.querySelector<HTMLCanvasElement>('canvas[role="img"]')!;
  return canvas
    .getContext("2d")!
    .getImageData(0, 0, canvas.width, canvas.height);
}
export async function pngPixels(
  win: Cypress.AUTWindow,
  blob: Blob,
  size?: { width: number; height: number }
): Promise<ImageData> {
  const bitmap = await win.createImageBitmap(blob);
  const canvas = win.document.createElement("canvas");
  canvas.width = size?.width ?? bitmap.width;
  canvas.height = size?.height ?? bitmap.height;
  const context = canvas.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  if (size) {
    // Compare canvas-to-canvas filtering; Chrome filters a decoded bitmap differently.
    const source = new win.OffscreenCanvas(bitmap.width, bitmap.height);
    source.getContext("2d")!.drawImage(bitmap, 0, 0);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  } else {
    context.drawImage(bitmap, 0, 0);
  }
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
export async function nativeResult(
  win: Cypress.AUTWindow,
  source: string,
  options: Record<string, string> = {}
) {
  const configuration = await (await win.fetch("/api/images/options")).json();
  const form = new win.FormData();
  form.set(
    "image",
    new win.Blob([Cypress.Buffer.from(source, "base64")], {
      type: "image/png"
    }),
    "source.png"
  );
  for (const [key, value] of Object.entries({
    outputWidthInCells: "80",
    characterRamp: "@%#*+=-:. ",
    invert: "true",
    sourceColors: "true",
    useMeasuredGlyphDensity: "true",
    ...options
  }))
    form.set(key, value);
  const response = await win.fetch("/api/images/convert", {
    method: "POST",
    headers: { "X-CSRF-TOKEN": configuration.requestToken },
    body: form
  });
  expect(response.status).to.eq(200);
  return response.json() as Promise<{
    text: string;
    widthInCells: number;
    heightInCells: number;
    png: string;
  }>;
}
export function compareWithNative(
  source = imageBase64,
  options: Record<string, string> = {}
) {
  cy.window().then(async (win) => {
    const native = await nativeResult(win, source, options);
    const actual = previewPixels(win);
    const expected = await pngPixels(
      win,
      new win.Blob([Cypress.Buffer.from(native.png, "base64")], {
        type: "image/png"
      }),
      actual
    );
    expect([actual.width, actual.height]).to.deep.eq([
      expected.width,
      expected.height
    ]);
    let differences = 0;
    for (let index = 0; index < actual.data.length; index++)
      if (actual.data[index] !== expected.data[index]) differences++;
    expect(
      differences,
      `native/browser differing channels (${JSON.stringify(options)})`
    ).to.eq(0);
  });
}

export function color(label: string, value: string) {
  cy.get(`input[aria-label="${label}"]`).then(($input) => {
    const input = $input[0]!;
    const win = input.ownerDocument.defaultView!;
    Object.getOwnPropertyDescriptor(
      win.HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, value);
    input.dispatchEvent(new win.Event("input", { bubbles: true }));
    input.dispatchEvent(new win.Event("change", { bubbles: true }));
  });
}
