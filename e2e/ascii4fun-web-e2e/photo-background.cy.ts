import {
  color,
  columns,
  compareWithNative,
  ready,
  transparentImageBase64,
  uploadImage
} from "./workspace-actions";

describe("Photo composition and dark tones", () => {
  it("matches native alpha composition, opacity, tone and Mono/Original", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    uploadImage(transparentImageBase64);
    ready();
    columns(16);
    color("Background", "#204060");
    cy.get('input[type="range"][aria-labelledby="shadowLift-label"]')
      .focus()
      .type("{end}");
    for (const opacity of [0, 35, 100]) {
      cy.get('input[type="range"][aria-labelledby="source-photo-label"]')
        .focus()
        .type("{home}" + "{rightarrow}".repeat(opacity));
      ready(16);
      compareWithNative(transparentImageBase64, {
        outputWidthInCells: "16",
        shadowLift: "100",
        sourcePhotoOpacity: String(opacity),
        backgroundColor: "#204060"
      });
    }
    cy.contains("button", "Mono").click();
    ready(16);
    compareWithNative(transparentImageBase64, {
      outputWidthInCells: "16",
      shadowLift: "100",
      sourcePhotoOpacity: "100",
      backgroundColor: "#204060",
      sourceColors: "false"
    });
    cy.get('button[aria-label="Remove image"]').click();
    uploadImage();
    ready(16);
    cy.get('input[type="range"][aria-labelledby="source-photo-label"]').should(
      "have.value",
      "100"
    );
    cy.get('button[aria-label="Reset to default"]').click();
    ready();
    cy.get('input[type="range"][aria-labelledby="source-photo-label"]').should(
      "have.value",
      "0"
    );
    cy.get('input[type="range"][aria-labelledby="shadowLift-label"]').should(
      "have.value",
      "0"
    );
    compareWithNative();
  });
});
