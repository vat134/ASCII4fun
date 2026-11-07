import {
  columns,
  compareWithNative,
  imageBase64,
  ready,
  uploadImage
} from "./workspace-actions";

describe("Shared browser engine", () => {
  for (const name of ["large-portrait.jpg", "twelve-megapixel.jpg"]) {
    it(`adjusts ${name} with a full-size photo background`, () => {
      cy.visit("/");
      cy.get("#image-upload").selectFile(`fixtures/${name}`, {
        force: true
      });
      ready();
      columns(160);
      cy.get('input[type="range"][aria-labelledby="source-photo-label"]')
        .focus()
        .type("{end}");
      ready(160);
      columns(180);
      for (let adjustment = 0; adjustment < 5; adjustment++) {
        cy.get('input[type="range"][aria-labelledby="contrast-label"]')
          .focus()
          .type("{rightarrow}");
        ready(180);
      }
      cy.readFile(`fixtures/${name}`, "base64").then((source) =>
        compareWithNative(source, {
          outputWidthInCells: "180",
          sourcePhotoOpacity: "100",
          contrast: "5"
        })
      );
      cy.get('[role="alert"]').should("not.exist");
    });
  }

  it("matches native Blocks and custom supplementary Unicode without an atlas", () => {
    cy.visit("/");
    uploadImage();
    ready();
    columns(16);
    cy.get("#character-set").click();
    cy.get('[role="option"]')
      .contains(/^Blocks/)
      .click();
    ready(16);
    compareWithNative(imageBase64, {
      outputWidthInCells: "16",
      characterRamp: "█▓▒░ "
    });
    cy.get("#character-set").click();
    cy.get('[role="option"]').contains("Custom characters").click();
    cy.get("#character-ramp").clear().type("@Σム𝔸𐀀⣿ ");
    ready(16);
    compareWithNative(imageBase64, {
      outputWidthInCells: "16",
      characterRamp: "@Σム𝔸𐀀⣿ "
    });
  });

  it("shares tone semantics and keeps the background fixed", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    uploadImage();
    ready();
    cy.get('input[type="range"][aria-labelledby="contrast-label"]')
      .focus()
      .type("{rightarrow}{rightarrow}");
    cy.get('input[type="range"][aria-labelledby="brightness-label"]')
      .focus()
      .type("{rightarrow}{rightarrow}{rightarrow}");
    ready();
    compareWithNative(imageBase64, { contrast: "2", brightness: "3" });
    cy.contains("button", "Mono").click();
    ready();
    cy.get('input[aria-label="Mono color"]').should("have.value", "#ffffff");
    cy.get('input[aria-label="Background"]').should("have.value", "#000000");
    compareWithNative(imageBase64, {
      sourceColors: "false",
      contrast: "2",
      brightness: "3"
    });
    cy.screenshot("production-browser-controls", { capture: "fullPage" });
  });
  for (const name of [
    "gradient.webp",
    "oriented.jpg",
    "tagged-rgb.png",
    "untagged-cmyk.jpg"
  ]) {
    it(`matches native decoding, orientation and color for ${name}`, () => {
      cy.visit("/");
      cy.get("#image-upload").selectFile(`fixtures/${name}`, { force: true });
      ready();
      columns(24);
      cy.readFile(`fixtures/${name}`, "base64").then((source) =>
        compareWithNative(source, { outputWidthInCells: "24" })
      );
      cy.get('input[type="range"][aria-labelledby="source-photo-label"]')
        .focus()
        .type("{end}");
      ready(24);
      cy.readFile(`fixtures/${name}`, "base64").then((source) =>
        compareWithNative(source, {
          outputWidthInCells: "24",
          sourcePhotoOpacity: "100"
        })
      );
    });
  }

  it("rejects animated and excessive media before conversion and recovers", () => {
    cy.visit("/");
    for (const [name, message] of [
      ["animated.webp", "multi-frame"],
      ["over-budget.png", "working-buffer budget"],
      ["over-dimension.png", "Invalid IHDR"]
    ]) {
      cy.get("#image-upload").selectFile(`fixtures/${name}`, { force: true });
      cy.get('[role="alert"]').should("contain.text", message);
      cy.contains("button", /^Clear$/).click();
    }
    uploadImage();
    ready();
    cy.get("#grid-columns").clear().type("500{enter}");
    ready(180);
    cy.get('[role="alert"]').should("not.exist");
    columns(80);
  });

  it("restarts a failed runtime download on Retry", () => {
    cy.intercept(
      { url: "**/engine-runtime/dotnet.js", times: 1 },
      { statusCode: 503 }
    );
    cy.visit("/");
    uploadImage();
    cy.get('[role="alert"]').should("contain.text", "could not start");
    cy.contains("button", "Retry").click();
    ready();
  });
  it("rejects a tall raster before reporting a blank canvas as ready", () => {
    cy.visit("/");
    cy.get("#grid-columns").clear().type("16{enter}");
    cy.get("#image-upload").selectFile("fixtures/tall.png", { force: true });
    cy.get('[role="alert"]').should("contain.text", "raster side limit");
    cy.contains("button", "Download PNG").should("be.disabled");
    cy.contains("button", /^Clear$/).click();
    uploadImage();
    ready(16);
  });
});
