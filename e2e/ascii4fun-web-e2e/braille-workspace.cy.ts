import {
  columns,
  compareWithNative,
  nativeResult,
  pngPixels,
  previewPixels,
  ready,
  transparentImageBase64,
  uploadImage
} from "./workspace-actions";

// Owned fixture: all 256 Unicode masks in row-major order, each made from eight black/white pixels.
const patterns =
  "iVBORw0KGgoAAAANSUhEUgAAACAAAABACAIAAAD07OL5AAAA3UlEQVR4nO2T4QqEMAyD9/4v3QNB8HpJ23nZQGl+SAmZI/10jENmNk6ls50qzsO9wrs6n4YqB2bzaq1l4KxrSOJHnZrBpv8Aro/pRn6L1jKANYV+M0hnf81vL5VPQ5UDNB9wkzy/7i/O0wzgpyb0m0HOANZU+rAd03T+FQxgTaHfDNLZX+NdnU9DlQNRfgeGtQycdQ1J/GaQM4A1lT6sxnQj/wIGsKbQbwbpPNwrvKvzaahygOYDPhL5/VZmtms2r/8PmkE245pK39D6gspz+XyL/2kLA0M1hf7DGXwA5Gr0ptFlrOUAAAAASUVORK5CYII=";
function style(name: "Braille" | "Characters") {
  cy.get("#image-style").click();
  cy.get('[role="option"]')
    .contains(new RegExp(`^${name}$`))
    .click();
  ready(16);
}

describe("Spatial Braille and shared blank cells", () => {
  it("resamples the original consistently at different widths and resets to Characters", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    cy.get("#image-upload").selectFile("fixtures/square-gradient.png", {
      force: true
    });
    ready();
    columns(16);
    style("Braille");
    for (const width of [16, 80, 180]) {
      columns(width);
      cy.readFile("fixtures/square-gradient.png", "base64").then((source) =>
        compareWithNative(source, {
          outputWidthInCells: String(width),
          style: "braille"
        })
      );
    }
    cy.get('button[aria-label="Reset to default"]').click();
    ready();
    cy.get("#image-style").should("contain.text", "Characters");
    cy.get("#character-set").should("be.visible");
  });

  it("matches all 256 native masks, copies and exports exact UTF-8 and the current raster", () => {
    const downloads: { name: string; blob: Promise<Blob> }[] = [];
    let copied = "";
    cy.viewport(1440, 1000);
    cy.visit("/", {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              copied = text;
            }
          }
        });
        win.HTMLAnchorElement.prototype.click = function () {
          downloads.push({
            name: this.download,
            blob: win.fetch(this.href).then((response) => response.blob())
          });
        };
      }
    });
    uploadImage(patterns);
    ready();
    columns(16);
    style("Braille");
    cy.get("#character-set").should("not.exist");
    cy.get('[aria-label="Copy text"]').click();
    cy.contains("button", "Download .txt").click();
    cy.contains("button", "Download PNG").click();
    cy.wrap(downloads).should("have.length", 2);
    cy.window().then(async (win) => {
      const native = await nativeResult(win, patterns, {
        outputWidthInCells: "16",
        style: "braille"
      });
      const expected = Array.from({ length: 16 }, (_, y) =>
        Array.from({ length: 16 }, (_, x) =>
          String.fromCodePoint(0x2800 + y * 16 + x)
        ).join("")
      ).join("\n");
      expect(native.text).to.eq(expected);
      expect(copied).to.eq(expected);
      expect(await (await downloads[0]!.blob).text()).to.eq(expected);
      const actual = await pngPixels(win, await downloads[1]!.blob);
      const target = await pngPixels(
        win,
        new win.Blob([Cypress.Buffer.from(native.png, "base64")], {
          type: "image/png"
        })
      );
      expect([actual.width, actual.height]).to.deep.eq([192, 384]);
      let differences = 0;
      for (let index = 0; index < actual.data.length; index++)
        if (actual.data[index] !== target.data[index]) differences++;
      expect(differences, "downloaded PNG matches native Braille").to.eq(0);
      const preview = previewPixels(win);
      const displayed = await pngPixels(win, await downloads[1]!.blob, preview);
      differences = 0;
      for (let index = 0; index < preview.data.length; index++)
        if (preview.data[index] !== displayed.data[index]) differences++;
      expect(differences, "displayed PNG matches preview").to.eq(0);
    });
    // A cached Characters result must not be mistaken for the Braille result at the same dimensions.
    style("Characters");
    cy.get("#character-set").should("exist");
    compareWithNative(patterns, { outputWidthInCells: "16" });
    style("Braille");
    compareWithNative(patterns, { outputWidthInCells: "16", style: "braille" });
  });

  it("preserves photo composition, tone, invert, color and transparent-source behavior", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    uploadImage(patterns);
    ready();
    columns(16);
    style("Braille");
    cy.contains("button", "Mono").click();
    cy.get('input[type="range"][aria-labelledby="source-photo-label"]')
      .focus()
      .type("{end}");
    ready(16);
    compareWithNative(patterns, {
      outputWidthInCells: "16",
      style: "braille",
      sourceColors: "false",
      sourcePhotoOpacity: "100"
    });
    cy.get('label[for="invert-mapping"]').click();
    cy.get('[role="switch"]').should("have.attr", "aria-checked", "false");
    cy.get('input[type="range"][aria-labelledby="brightness-label"]')
      .focus()
      .type("{end}");
    ready(16);
    compareWithNative(patterns, {
      outputWidthInCells: "16",
      style: "braille",
      sourceColors: "false",
      sourcePhotoOpacity: "100",
      invert: "false",
      brightness: "40"
    });
    uploadImage(transparentImageBase64, "alpha.png");
    ready(16);
    compareWithNative(transparentImageBase64, {
      outputWidthInCells: "16",
      style: "braille",
      sourceColors: "false",
      sourcePhotoOpacity: "100",
      invert: "false",
      brightness: "40"
    });
  });
});
