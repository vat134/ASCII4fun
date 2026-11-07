import { columns, compareWithNative, ready } from "./workspace-actions";

describe("Preview quality and editor limits", () => {
  it("constrains Columns and tone controls to the editor ranges", () => {
    cy.visit("/");
    cy.get('input[type="range"][aria-labelledby="grid-columns-label"]')
      .should("have.attr", "min", "16")
      .and("have.attr", "max", "180");
    for (const name of ["contrast", "brightness"])
      cy.get(`input[type="range"][aria-labelledby="${name}-label"]`)
        .should("have.attr", "min", "-40")
        .and("have.attr", "max", "40");
    cy.get("#grid-columns").clear().type("500{enter}");
    cy.get("#grid-columns").should("have.value", "180");
    cy.get("#grid-columns").clear().type("1{enter}");
    cy.get("#grid-columns").should("have.value", "16");
  });

  it("uses the full available desktop height and keeps a photo view stable across adjacent widths", () => {
    cy.viewport(1800, 1200);
    cy.visit("/");
    cy.get('section[aria-label="Preview workspace"]').should(($panel) => {
      const panel = $panel[0]!;
      const workspace = panel.parentElement!;
      const style = getComputedStyle(workspace);
      const availableHeight =
        workspace.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      expect(panel.getBoundingClientRect().height).to.be.closeTo(
        availableHeight,
        1
      );
    });
    cy.get("#image-upload").selectFile("fixtures/square-gradient.png", {
      force: true
    });
    ready();
    for (const width of [16, 80, 160, 170, 180]) {
      columns(width);
      cy.get('canvas[role="img"]').should(($canvas) => {
        const canvas = $canvas[0] as HTMLCanvasElement;
        const bounds = canvas.getBoundingClientRect();
        expect(canvas.width).to.be.at.most(
          Math.ceil(bounds.width * window.devicePixelRatio) + 1
        );
        expect(canvas.height).to.be.at.most(
          Math.ceil(bounds.height * window.devicePixelRatio) + 1
        );
      });
      cy.get('[role="alert"]').should("not.exist");
    }
    cy.readFile("fixtures/square-gradient.png", "base64").then((source) =>
      compareWithNative(source, { outputWidthInCells: "180" })
    );
    cy.screenshot("preview-photo-180", { capture: "fullPage" });
    cy.viewport(390, 844);
    cy.get('[aria-label="ASCII preview viewport"]').should(($viewport) => {
      const viewport = $viewport[0]!;
      expect(viewport.scrollWidth).to.be.at.most(viewport.clientWidth + 1);
      expect(viewport.scrollHeight).to.be.at.most(viewport.clientHeight + 1);
    });
    cy.get('canvas[role="img"]').should(($canvas) => {
      expect($canvas[0]!.getBoundingClientRect().width).to.be.at.most(390);
    });
    cy.readFile("fixtures/square-gradient.png", "base64").then((source) =>
      compareWithNative(source, { outputWidthInCells: "180" })
    );
  });
});
