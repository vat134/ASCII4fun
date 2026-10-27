// A project-owned 4 × 2 PNG fixture with a black/white split.
const imageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEUlEQVR4nGNgAIP/YMCAzAEAd6IL9cTZu14AAAAASUVORK5CYII=";

function uploadImage() {
  cy.get("#image-upload").selectFile(
    {
      contents: Cypress.Buffer.from(imageBase64, "base64"),
      fileName: "source.png",
      mimeType: "image/png"
    },
    { force: true }
  );
}

describe("Still-image workspace", () => {
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
      .focus()
      .type("{rightarrow}");
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
    cy.get('svg[aria-label^="ASCII preview"]').should("be.visible");
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
    cy.get('[role="switch"]').focus().type(" ");
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
    for (let step = 0; step < 10; step++)
      cy.get('button[aria-label="Zoom in"]').click();
    cy.get('output[aria-label="Preview zoom level"]').should(
      "have.text",
      "200%"
    );
    cy.get('svg[aria-label^="ASCII preview"]')
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

  it("keeps Unicode glyphs and empty cells at fixed column positions", () => {
    const ramps = [
      "@%#*+=-:. ",
      "█▓▒░ ",
      "█▙▛▜▟▀▄▌▐▘▝▖▗ ",
      "█◆■▲▼◇△▽. ",
      "ムミヒリツソノ:. ",
      "@𝔸. "
    ];
    const widthInCells = 160;
    const rows = Array.from({ length: 80 }, (_, index) => {
      const ramp = Array.from(ramps[index % ramps.length]!);
      return Array.from({ length: widthInCells }, (_, column) =>
        column < 8 || column >= widthInCells - 8
          ? " "
          : ramp[column % ramp.length]
      ).join("");
    });
    cy.intercept("POST", "/api/images/convert", {
      body: { text: rows.join("\n"), widthInCells, heightInCells: rows.length }
    }).as("convert");
    cy.viewport(1440, 900);
    cy.visit("/");
    uploadImage();
    cy.wait("@convert");
    cy.get('svg[aria-label^="ASCII preview"]').should(($svg) => {
      const svg = $svg[0] as unknown as SVGSVGElement;
      const renderedRows = svg.querySelectorAll("tspan");
      expect(renderedRows.length).to.eq(rows.length);
      renderedRows.forEach((row, index) => {
        expect(row.textContent).to.eq(rows[index]);
        const glyphs = Array.from(rows[index]!);
        let utf16Index = 0;
        let maximumColumnError = 0;
        glyphs.forEach((glyph, column) => {
          if ([0, 8, 9, 10, 11, 40, 80, 159].includes(column))
            maximumColumnError = Math.max(
              maximumColumnError,
              Math.abs(row.getStartPositionOfChar(utf16Index).x - column)
            );
          utf16Index += glyph.length;
        });
        expect(maximumColumnError).to.be.lessThan(0.01);
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
      cy.get('svg[aria-label^="ASCII preview"]').should(($svg) => {
        const svg = $svg[0] as unknown as SVGSVGElement;
        expect(svg.viewBox.baseVal.width / svg.viewBox.baseVal.height).to.eq(2);
        const row = svg.querySelector("tspan")!;
        expect(row.getComputedTextLength()).to.be.closeTo(300, 0.01);
        const transform = row.getScreenCTM()!;
        const start = new DOMPoint(0, 0).matrixTransform(transform);
        const end = new DOMPoint(300, 0).matrixTransform(transform);
        const viewport = svg.getBoundingClientRect();
        expect((start.x + end.x) / 2).to.be.closeTo(
          viewport.x + viewport.width / 2,
          1
        );
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
    cy.get('svg[aria-label^="ASCII preview"]').should("be.visible");
  });

  if (Cypress.expose("visualInput")) {
    it("captures a local reference image for visual evaluation", () => {
      cy.viewport(1600, 1000);
      cy.visit("/");
      cy.get("#image-upload").selectFile(
        String(Cypress.expose("visualInput")),
        { force: true }
      );
      cy.get('svg[aria-label^="ASCII preview"]').should("be.visible");
      cy.get("#grid-columns").clear().type("300").blur();
      cy.get('img[alt="Uploaded source thumbnail"]').then(($source) => {
        const source = $source[0] as HTMLImageElement;
        cy.get('svg[aria-label^="ASCII preview, 300"]').should(($svg) => {
          const svg = $svg[0] as unknown as SVGSVGElement;
          const row = svg.querySelector("tspan")!;
          const transform = row.getScreenCTM()!;
          const start = new DOMPoint(0, 0).matrixTransform(transform);
          const end = new DOMPoint(300, 0).matrixTransform(transform);
          const viewport = svg.getBoundingClientRect();
          // Grid row rounding may differ from the source by at most one cell height.
          const grid = svg.viewBox.baseVal;
          expect(grid.height).to.be.closeTo(
            (300 * source.naturalHeight) / source.naturalWidth,
            2
          );
          expect(end.x - start.x).to.be.closeTo(
            Math.min(
              viewport.width,
              (viewport.height * grid.width) / grid.height
            ),
            1
          );
          expect((start.x + end.x) / 2).to.be.closeTo(
            viewport.x + viewport.width / 2,
            1
          );
        });
      });
      cy.screenshot("workspace-local-image", { capture: "fullPage" });
    });
  }
});
