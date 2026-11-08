import {
  color,
  columns,
  compareWithNative,
  imageBase64,
  nativeResult,
  pngPixels,
  previewPixels,
  ready,
  transparentImageBase64,
  uploadImage
} from "./workspace-actions";

describe("Still-image workspace", () => {
  it("keeps numeric delay and immediate column shortcuts", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    uploadImage();
    ready();
    cy.get("#grid-columns").clear().type("16");
    cy.wait(500);
    cy.get('canvas[role="img"]')
      .should("have.attr", "aria-label")
      .and("include", "80 columns");
    cy.get("#grid-columns").type("0");
    ready(160);
    for (const [name, width] of [
      ["Double columns", 180],
      ["Halve columns", 90],
      ["Add 10 columns", 100],
      ["Subtract 10 columns", 90]
    ] as const) {
      cy.get(`button[aria-label="${name}"]`).click();
      ready(width);
    }
  });

  it("exports the current full raster and glyph-only TXT independently of zoom", () => {
    const downloads: { name: string; blob: Promise<Blob> }[] = [];
    let copiedText: string | null = null;
    cy.visit("/", {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              copiedText = text;
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
    cy.get('[aria-label="Copy text"]').should("be.disabled");
    uploadImage();
    ready();
    columns(40);
    cy.get('input[type="range"][aria-labelledby="shadowLift-label"]')
      .focus()
      .type("{end}{leftarrow}");
    cy.get('input[type="range"][aria-labelledby="source-photo-label"]')
      .focus()
      .type("{end}");
    ready(40);
    cy.get('button[aria-label="Zoom in"]').click().click();
    cy.get('[aria-label="Copy text"]').click().should("contain.text", "Copied");
    cy.contains("button", "Download PNG").click();
    cy.contains("button", "Download .txt").click();
    cy.wrap(downloads).should("have.length", 2);
    cy.window().then(async (win) => {
      const native = await nativeResult(win, imageBase64, {
        outputWidthInCells: "40",
        shadowLift: "99",
        sourcePhotoOpacity: "100"
      });
      expect(downloads.map((item) => item.name)).to.deep.eq([
        "source.png",
        "source.txt"
      ]);
      const txt = await (await downloads[1]!.blob).text();
      expect(txt).to.eq(native.text);
      expect(txt).to.contain(" ");
      expect(txt).not.to.contain("\u2800");
      expect(txt).not.to.contain("\u00a0");
      expect(copiedText).to.eq(native.text);
      const actual = await pngPixels(win, await downloads[0]!.blob);
      const expected = await pngPixels(
        win,
        new win.Blob([Cypress.Buffer.from(native.png, "base64")], {
          type: "image/png"
        })
      );
      expect([actual.width, actual.height]).to.deep.eq([
        expected.width,
        expected.height
      ]);
      let differences = 0;
      for (let index = 0; index < actual.data.length; index++)
        if (actual.data[index] !== expected.data[index]) differences++;
      expect(differences, "full PNG matches native export").to.eq(0);
      const preview = previewPixels(win);
      const displayed = await pngPixels(win, await downloads[0]!.blob, preview);
      differences = 0;
      for (let index = 0; index < preview.data.length; index++)
        if (preview.data[index] !== displayed.data[index]) differences++;
      expect(differences, "preview matches displayed export").to.eq(0);
    });
  });

  it("keeps Copy text and preview controls usable on a narrow screen", () => {
    cy.viewport(320, 900);
    cy.visit("/");
    uploadImage();
    ready();
    cy.get('[aria-label="Copy text"]').should("be.visible").and("be.enabled");
    cy.get('[aria-label="Zoom in"]').should("be.visible");
    cy.get('[aria-label="Remove image"]').should("be.visible");
    cy.document().should((document) =>
      expect(document.documentElement.scrollWidth).to.be.at.most(320)
    );
    cy.screenshot("media-copy-320", { capture: "fullPage" });
    cy.get('[aria-label="Remove image"]').click();
    cy.get('[aria-label="Copy text"]').should("be.disabled");
  });

  it("matches native transparent input, Mono ink and background pixels", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    uploadImage(transparentImageBase64);
    ready();
    columns(16);
    compareWithNative(transparentImageBase64, { outputWidthInCells: "16" });
    cy.contains("button", "Mono").click();
    ready(16);
    color("Mono color", "#00ffff");
    color("Background", "#102030");
    ready(16);
    compareWithNative(transparentImageBase64, {
      outputWidthInCells: "16",
      sourceColors: "false",
      monochromeColor: "#00ffff",
      backgroundColor: "#102030"
    });
    cy.screenshot("workspace-tone-colors", { capture: "fullPage" });
  });

  it("clears errors without resetting settings and accepts a new source", () => {
    cy.visit("/");
    cy.contains("button", "Mono").click();
    cy.get("#image-upload").selectFile(
      {
        contents: Cypress.Buffer.from("broken image"),
        fileName: "bad.png",
        mimeType: "image/png"
      },
      { force: true }
    );
    cy.get('[role="alert"]').should("contain.text", "signature");
    cy.contains("button", "Retry").click();
    cy.get('[role="alert"]').should("be.visible");
    cy.contains("button", /^Clear$/).click();
    cy.get('[role="alert"]').should("not.exist");
    cy.contains("button", "Mono").should("have.attr", "aria-pressed", "true");
    uploadImage();
    ready();
    compareWithNative(imageBase64, { sourceColors: "false" });
  });
});
