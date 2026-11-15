import {
  compareWithNative,
  pngPixels,
  previewPixels,
  ready,
  transparentImageBase64,
  uploadImage
} from "./workspace-actions";

describe("Photo processing", () => {
  it("exports the displayed Photo GIF frame ", () => {
    let download: Promise<Blob> | undefined;
    cy.visit("/", {
      onBeforeLoad(win) {
        win.HTMLAnchorElement.prototype.click = function () {
          download = win.fetch(this.href).then((response) => response.blob());
        };
      }
    });
    cy.contains("label", "Photo processing").click();
    cy.get("#image-upload").selectFile(
      {
        contents: Cypress.Buffer.from(
          "R0lGODlhBAAEAPAAAP8AAAAAACH/C05FVFNDQVBFMi4wAwECAAAh+QQEAwAAACwAAAAABAAEAAACBISPCQUAIfkEDAcAAAAsAQABAAIAAgCAAP8AAAAAAgKEUQAh+QQICwAAACwDAAMAAQABAIAAAP8AAAACAkQBADs=",
          "base64"
        ),
        fileName: "motion.gif",
        mimeType: "image/gif"
      },
      { force: true }
    );
    cy.get("main", { timeout: 30000 }).should(($main) => {
      expect($main.find('[role="alert"]').text(), "conversion error").to.eq("");
      expect(
        $main
          .find("button")
          .toArray()
          .some((button) => button.textContent === "Play"),
        "finite GIF finishes playback"
      ).to.eq(true);
    });
    cy.contains("button", "PNG current frame").should("be.enabled").click();
    cy.then(() => expect(download).not.to.eq(undefined));
    cy.window().then(async (win) => {
      const displayed = previewPixels(win);
      const png = await pngPixels(win, await download!, displayed);
      let differences = 0;
      for (let index = 0; index < png.data.length; index++)
        if (png.data[index] !== displayed.data[index]) differences++;
      expect(differences, "Photo PNG matches the displayed GIF frame").to.eq(0);
    });
  });

  it("matches native photo glyphs and the retained photo layer", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    uploadImage(transparentImageBase64);
    ready();
    cy.contains("label", "Photo processing").click();
    ready();
    compareWithNative(transparentImageBase64, { usePhotoStyle: "true" });
    ready();
    cy.get('input[type="range"][aria-labelledby="source-photo-label"]')
      .focus()
      .type("{end}");
    ready();
    compareWithNative(transparentImageBase64, {
      usePhotoStyle: "true",
      sourcePhotoOpacity: "100"
    });
    cy.screenshot("photo-processing-enabled");
    cy.get('button[aria-label="Reset to default"]').click();
    ready();
    cy.get("input#photo-style").should("not.be.checked");
    compareWithNative(transparentImageBase64);
    cy.screenshot("photo-processing-reset");
  });

  it("matches native spatial glyph selection on thin lines", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    cy.readFile("fixtures/shape-lines.png", "base64").then((source: string) => {
      uploadImage(source);
      ready();
      cy.contains("label", "Photo processing").click();
      cy.contains("label", "Invert mapping").click();
      cy.contains("button", "Mono").click();
      ready();
      compareWithNative(source, {
        usePhotoStyle: "true",
        invert: "false",
        sourceColors: "false"
      });
      cy.screenshot("photo-spatial-lines");
    });
  });
});
