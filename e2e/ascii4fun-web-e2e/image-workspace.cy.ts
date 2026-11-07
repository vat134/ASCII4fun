// A project-owned 4 × 2 PNG fixture with a black/white split.
const imageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEUlEQVR4nGNgAIP/YMCAzAEAd6IL9cTZu14AAAAASUVORK5CYII=";
// Owned RGBA fixture: red, green, half-transparent blue, and fully transparent black.
const transparentImageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAGklEQVR4nGP4z8DwHwwZ/jcwMDAwMIEIZAAAlrgFfp5ub54AAAAASUVORK5CYII=";

function uploadImage(contents = imageBase64) {
  cy.get("#image-upload").selectFile(
    {
      contents: Cypress.Buffer.from(contents, "base64"),
      fileName: "source.png",
      mimeType: "image/png"
    },
    { force: true }
  );
}

describe("Still-image workspace", () => {
  it("applies column shortcuts and waits for finished numeric input", () => {
    cy.viewport(1440, 900);
    cy.intercept("POST", "/api/images/convert").as("convert");
    cy.visit("/");
    uploadImage();
    cy.wait("@convert");
    cy.contains("button", "Download PNG").should("be.enabled");
    cy.clock();
    cy.get("#grid-columns").focus().clear().type("16");
    cy.tick(500);
    cy.get("@convert.all").should("have.length", 1);
    cy.get("#grid-columns").type("0");
    cy.tick(999);
    cy.get("@convert.all").should("have.length", 1);
    cy.tick(1);
    cy.get('input[type="range"][aria-labelledby="grid-columns-label"]').should(
      "have.value",
      "160"
    );
    cy.tick(200);
    cy.wait("@convert").its("response.body.widthInCells").should("eq", 160);
    for (const [name, width] of [
      ["Double columns", "320"],
      ["Halve columns", "160"],
      ["Add 10 columns", "170"],
      ["Subtract 10 columns", "160"]
    ]) {
      cy.get(`button[aria-label="${name}"]`).click();
      cy.get("#grid-columns").should("have.value", width);
    }
    cy.tick(200);
    cy.wait("@convert").its("response.body.widthInCells").should("eq", 160);
    cy.get("#grid-columns").focus().clear().type("240{enter}");
    cy.tick(200);
    cy.wait("@convert").its("response.body.widthInCells").should("eq", 240);
    cy.tick(1000);
    cy.get("@convert.all").should("have.length", 4);
    cy.get("#grid-columns").focus().clear().type("100");
    cy.get('button[aria-label="Double columns"]').click();
    cy.get("#grid-columns").should("have.value", "200");
    cy.tick(200);
    cy.wait("@convert").its("response.body.widthInCells").should("eq", 200);
    cy.tick(1000);
    cy.get("@convert.all").should("have.length", 5);
    cy.contains("button", "Download PNG").should("be.enabled");
    cy.screenshot("workspace-column-shortcuts", { capture: "fullPage" });
  });

  it("keeps input and slider in sync and downloads the actual engine result", () => {
    cy.viewport(1440, 900);
    cy.intercept("POST", "/api/images/convert").as("convert");
    cy.visit("/");
    cy.get('[role="tab"]')
      .contains("Text")
      .should("have.attr", "aria-disabled", "true");
    cy.get('input[aria-label="Media URL"]').should("be.disabled");
    cy.get('[data-slot="slider-track"]')
      .should(($track) => expect($track.height()).to.eq(4))
      .parent()
      .should(($control) => expect($control.height()).to.eq(44))
      .click("topLeft");
    cy.get("#grid-columns").should("have.value", "1");
    cy.get('[data-slot="slider-track"]').parent().click("bottomRight");
    cy.get("#grid-columns").should("have.value", "500");
    cy.get("#grid-columns").clear().type("80").blur();
    cy.get('input[type="range"][aria-labelledby="grid-columns-label"]')
      .should("have.value", "80")
      .focus()
      .type("{rightarrow}")
      .should("have.value", "81");
    cy.get("#grid-columns").should("have.value", "81");
    cy.get("#grid-columns")
      .click("left")
      .should(($input) => {
        const input = $input[0] as HTMLInputElement;
        expect(input.selectionStart).to.eq(0);
        expect(input.selectionEnd).to.eq(2);
        expect(input.getBoundingClientRect().width).to.eq(64);
      });
    cy.get("#grid-columns").type("120").blur();
    cy.get("#grid-columns").should("have.value", "120");
    cy.get("#grid-columns").clear().type("901").blur();
    cy.get("#grid-columns").should("have.value", "500");
    cy.get("#grid-columns").clear().blur();
    cy.get("#grid-columns").should("have.value", "500");
    uploadImage();
    cy.wait("@convert").its("response.statusCode").should("eq", 200);
    cy.get('img[alt^="ASCII preview"]').should("be.visible");
    cy.get("#grid-columns").clear().type("160").blur();
    cy.wait("@convert").its("response.body.widthInCells").should("eq", 160);
    cy.get("#grid-columns").focus().type("{uparrow}").blur();
    cy.get('input[type="range"][aria-labelledby="grid-columns-label"]')
      .focus()
      .type("{rightarrow}");
    cy.get("#grid-columns").should("have.value", "162");
    cy.wait("@convert").its("response.body.widthInCells").should("eq", 162);
    cy.get("#grid-columns").should("have.attr", "type", "text");
    cy.contains("button", "Original").should("not.exist");
    cy.get("#invert-mapping").prev('[role="switch"]').focus().type(" ");
    cy.wait("@convert").then(({ response }) => {
      cy.contains("button", "Download .txt").click();
      cy.readFile("../../artifacts/cypress/downloads/source.txt").should(
        "eq",
        response?.body.text
      );
    });
    cy.get('aside[aria-label="Conversion settings"] footer').should(
      "be.visible"
    );
    for (let step = 0; step < 4; step++)
      cy.get('button[aria-label="Zoom in"]').click();
    cy.get('output[aria-label="Preview zoom level"]').should(
      "have.text",
      "200%"
    );
    cy.get('img[alt^="ASCII preview"]')
      .parent()
      .should(($viewport) => {
        expect($viewport[0]!.scrollWidth).to.be.greaterThan(
          $viewport[0]!.clientWidth
        );
      })
      .scrollTo("bottomRight");
    cy.contains("button", "Download .txt").should("be.enabled");
    cy.get('button[aria-label="Reset to default"]')
      .trigger("mouseover")
      .trigger("mouseenter")
      .trigger("mousemove");
    cy.get('[data-slot="tooltip-content"]')
      .should("be.visible")
      .and("have.text", "Reset to default");
    cy.get('button[aria-label="Reset to default"]').click();
    cy.wait("@convert");
    cy.get("#grid-columns").should("have.value", "80");
    cy.get('output[aria-label="Preview zoom level"]').should(
      "have.text",
      "100%"
    );
    cy.document().then((document) => {
      expect(document.documentElement.scrollHeight).to.be.at.most(900);
      expect(document.documentElement.scrollWidth).to.be.at.most(1440);
    });
    cy.screenshot("workspace-desktop", { capture: "fullPage" });
    cy.viewport(1280, 640);
    cy.get('aside[aria-label="Conversion settings"] footer').should(
      "be.visible"
    );
    cy.get('aside[aria-label="Conversion settings"] .overflow-y-auto').scrollTo(
      "bottom"
    );
    cy.get("#character-set").click();
    cy.get('[data-slot="select-content"]')
      .should(($popup) => {
        const bounds = $popup[0]!.getBoundingClientRect();
        expect(bounds.top).to.be.at.least(0);
        expect(bounds.bottom).to.be.at.most(640);
      })
      .type("{esc}");
    cy.document().then((document) =>
      expect(document.documentElement.scrollHeight).to.be.at.most(640)
    );
  });

  it("stacks the workspace on mobile without horizontal page overflow", () => {
    cy.viewport(390, 844);
    cy.visit("/");
    cy.contains("Drop an image here").should("be.visible");
    cy.document().then((document) =>
      expect(document.documentElement.scrollWidth).to.be.at.most(390)
    );
    cy.get('aside[aria-label="Conversion settings"]').scrollIntoView();
    cy.get("#character-set").click();
    cy.get('[role="option"]').contains("Minimal").click();
    cy.get("#character-ramp").should("not.exist");
    cy.get('[aria-labelledby="character-ramp-label"]')
      .should("have.text", "█▪ ")
      .click()
      .should("not.be.focused");
    cy.get("#character-set").click();
    cy.get('[role="option"]').contains("Custom characters").click();
    cy.get("#character-ramp").should("not.have.attr", "readonly");
    cy.get("#character-ramp")
      .should("have.value", "@%#*+=-:. ")
      .clear()
      .type("@  #   .   ");
    cy.get("#character-ramp").should("have.value", "@ # . ");
    cy.get("#character-set").click();
    cy.get('[role="option"]').contains("Classic ASCII").click();
    cy.get("#character-ramp").should("not.exist");
    cy.get("#character-set").click();
    cy.get('[role="option"]').contains("Custom characters").click();
    cy.get("#character-ramp").should("have.value", "@ # . ");
    cy.contains("button", "Download .txt").should("be.visible");
    cy.screenshot("workspace-mobile", { capture: "fullPage" });
  });

  it("keeps transparent-input glyphs unchanged with color and downloads preview bytes after zoom", () => {
    cy.viewport(1440, 900);
    cy.intercept("POST", "/api/images/convert").as("convert");
    cy.visit("/");
    uploadImage(transparentImageBase64);
    cy.wait("@convert").then(({ response: color }) => {
      cy.get("#source-colors")
        .prev('[role="switch"]')
        .should("have.attr", "aria-checked", "true")
        .focus()
        .type(" ");
      cy.contains("button", "Download PNG").should("be.disabled");
      cy.contains("button", "Download .txt").should("be.disabled");
      cy.wait("@convert").then(({ response }) => {
        expect(response?.body.text).to.eq(color?.body.text);
        expect(response?.body.widthInCells).to.eq(color?.body.widthInCells);
        expect(response?.body.heightInCells).to.eq(color?.body.heightInCells);
        expect(response?.body.png).not.to.eq(color?.body.png);
        for (let step = 0; step < 4; step++)
          cy.get('button[aria-label="Zoom in"]').click();
        cy.get('img[alt^="ASCII preview"]').should(
          "have.attr",
          "src",
          `data:image/png;base64,${response?.body.png}`
        );
        cy.contains("button", "Download PNG").click();
        cy.readFile(
          "../../artifacts/cypress/downloads/source.png",
          "base64"
        ).should("eq", response?.body.png);
        cy.contains("button", "Download .txt").click();
        cy.readFile("../../artifacts/cypress/downloads/source.txt").should(
          "eq",
          response?.body.text
        );
      });
    });
  });

  it("renders every character set through the engine in a centered, bounded preview", () => {
    cy.viewport(1920, 1200);
    cy.intercept("POST", "/api/images/convert").as("convert");
    cy.visit("/");
    uploadImage();
    cy.wait("@convert");
    cy.get("#grid-columns").clear().type("300").blur();
    cy.wait("@convert");
    cy.get('section[aria-label="Preview workspace"]').should(($preview) => {
      expect($preview.height()).to.be.at.most(800);
    });
    const names = [
      "Standard",
      "Classic ASCII",
      "Ink",
      "Minimal",
      "Forensic",
      "Blocks",
      "Bars",
      "Quadrants",
      "Braille",
      "Numeric",
      "Binary",
      "Hacker",
      "Alpha",
      "Dots",
      "Geometric",
      "Math",
      "Katakana"
    ];
    for (const name of names) {
      cy.get("#character-set").click();
      if (name === "Standard")
        cy.screenshot("character-sets", { capture: "viewport" });
      cy.get('[role="option"]')
        .contains("span", new RegExp(`^${name}$`, "u"))
        .click();
      cy.wait("@convert").then(({ response }) => {
        expect(response?.statusCode).to.eq(200);
        expect(
          response?.body.text
            .split("\n")
            .every((row: string) => Array.from(row).length === 300)
        ).to.eq(true);
      });
      cy.get('img[alt^="ASCII preview"]').should(($image) => {
        const image = $image[0] as HTMLImageElement;
        expect(image.complete).to.eq(true);
        expect(image.naturalWidth).to.eq(3600);
        expect(image.naturalHeight).to.eq(1800);
        expect(image.getBoundingClientRect().width).to.be.greaterThan(0);
      });
    }
  });

  it("reports malformed image content and allows choosing another file", () => {
    cy.visit("/");
    cy.get("#image-upload").selectFile(
      {
        contents: Cypress.Buffer.from("invalid image"),
        fileName: "broken.png",
        mimeType: "image/png"
      },
      { force: true }
    );
    cy.get('[role="alert"]').should("contain.text", "not supported");
    cy.contains("button", "Download .txt").should("be.disabled");
    uploadImage();
    cy.get('img[alt^="ASCII preview"]').should("be.visible");
  });

  if (Cypress.expose("visualInput")) {
    it("captures a local reference image for visual evaluation", () => {
      cy.viewport(1600, 1000);
      cy.intercept("POST", "/api/images/convert").as("convert");
      cy.visit("/");
      cy.get("#source-colors").prev('[role="switch"]').click();
      cy.get("#image-upload").selectFile(
        String(Cypress.expose("visualInput")),
        { force: true }
      );
      cy.wait("@convert");
      cy.get('img[alt^="ASCII preview"]').should("be.visible");
      cy.get("#grid-columns").clear().type("300").blur();
      cy.wait("@convert");
      cy.contains("button", "Download PNG").should("be.enabled");
      cy.screenshot("workspace-local-monochrome", { capture: "fullPage" });
      cy.get("#source-colors").prev('[role="switch"]').click();
      cy.wait("@convert").then(({ response }) => {
        cy.get('img[alt^="ASCII preview"]').should(
          "have.attr",
          "src",
          `data:image/png;base64,${response?.body.png}`
        );
        cy.contains("button", "Download PNG").click();
        const fileName = String(Cypress.expose("visualInput"))
          .split(/[\\/]/u)
          .pop()!;
        cy.readFile(
          `../../artifacts/cypress/downloads/${fileName.replace(/\.[^.]+$/u, "")}.png`,
          "base64"
        ).should("eq", response?.body.png);
      });
      cy.get('img[alt^="ASCII preview, 300"]').should(($image) => {
        const image = $image[0] as HTMLImageElement;
        expect(image.naturalWidth).to.eq(3600);
        expect(image.complete).to.eq(true);
      });
      cy.screenshot("workspace-local-image", { capture: "fullPage" });
      cy.get("#character-set").click();
      cy.get('[role="option"]')
        .contains("span", /^Blocks$/u)
        .click();
      cy.wait("@convert");
      cy.contains("button", "Download PNG").should("be.enabled");
      cy.get('img[alt^="ASCII preview"]').should(($image) => {
        expect(($image[0] as HTMLImageElement).complete).to.eq(true);
      });
      cy.screenshot("workspace-local-blocks", { capture: "fullPage" });
    });
  }
});
