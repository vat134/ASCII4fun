export {};

// Project-owned black/white 4 × 2 PNG.
const imageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEUlEQVR4nGNgAIP/YMCAzAEAd6IL9cTZu14AAAAASUVORK5CYII=";
const viewportSelector = '[aria-label="ASCII preview viewport"]';

// Chrome input creates an active pointer; synthetic events cannot exercise pointer capture.
function mouse(
  type: "mousePressed" | "mouseMoved" | "mouseReleased",
  x: number,
  y: number,
  buttons: number
) {
  return Cypress.automation("remote:debugger:protocol", {
    command: "Input.dispatchMouseEvent",
    params: {
      type,
      x,
      y,
      buttons,
      button: type === "mouseMoved" && buttons === 0 ? "none" : "left",
      clickCount: 1
    }
  });
}

describe("Preview navigation", () => {
  it("centers button zoom and pans with a captured mouse without changing the export", () => {
    cy.viewport(1440, 900);
    cy.intercept("POST", "/api/images/convert").as("convert");
    cy.visit("/");
    cy.get("#image-upload").selectFile(
      {
        contents: Cypress.Buffer.from(imageBase64, "base64"),
        fileName: "navigation.png",
        mimeType: "image/png"
      },
      { force: true }
    );
    cy.wait("@convert").then(({ response }) => {
      const png = response?.body.png;
      cy.contains("button", "Download PNG").should("be.enabled");
      for (let step = 0; step < 12; step++)
        cy.get('button[aria-label="Zoom in"]').click();
      cy.get('output[aria-label="Preview zoom level"]').should(
        "have.text",
        "400%"
      );
      cy.get('button[aria-label="Zoom in"]').should("be.disabled");
      cy.get(viewportSelector).should(($viewport) => {
        const viewport = $viewport[0]!;
        expect(viewport.scrollLeft).to.be.closeTo(
          (viewport.scrollWidth - viewport.clientWidth) / 2,
          1
        );
        expect(viewport.scrollTop).to.be.closeTo(
          (viewport.scrollHeight - viewport.clientHeight) / 2,
          1
        );
        expect(viewport.scrollLeft).to.be.greaterThan(0);
        expect(viewport.scrollTop).to.be.greaterThan(0);
      });
      cy.window().then(async (win) => {
        const viewport =
          win.document.querySelector<HTMLDivElement>(viewportSelector)!;
        const bounds = viewport.getBoundingClientRect();
        const frame = window.parent.document
          .querySelector<HTMLIFrameElement>("iframe.aut-iframe")!
          .getBoundingClientRect();
        const scaleX = frame.width / win.innerWidth;
        const scaleY = frame.height / win.innerHeight;
        const x = frame.left + (bounds.left + bounds.width / 2) * scaleX;
        const y = frame.top + (bounds.top + bounds.height / 2) * scaleY;
        const left = viewport.scrollLeft;
        const top = viewport.scrollTop;
        await mouse("mouseMoved", x, y, 0);
        await mouse("mousePressed", x, y, 1);
        await mouse("mouseMoved", x - 60 * scaleX, y - 40 * scaleY, 1);
        await new Promise((resolve) => win.requestAnimationFrame(resolve));
        expect(viewport.scrollLeft).to.be.closeTo(left + 60, 1);
        expect(viewport.scrollTop).to.be.closeTo(top + 40, 1);
        // Capture must keep routing movement even outside the viewport.
        await mouse(
          "mouseMoved",
          frame.left + (bounds.left - 10) * scaleX,
          y,
          1
        );
        await new Promise((resolve) => win.requestAnimationFrame(resolve));
        expect(viewport.scrollLeft).to.be.closeTo(
          Math.min(
            viewport.scrollWidth - viewport.clientWidth,
            left + bounds.width / 2 + 10
          ),
          1
        );
        await mouse(
          "mouseReleased",
          frame.left + (bounds.left - 10) * scaleX,
          y,
          0
        );
        const releasedLeft = viewport.scrollLeft;
        await mouse("mouseMoved", x + 30 * scaleX, y, 0);
        await new Promise((resolve) => win.requestAnimationFrame(resolve));
        expect(viewport.scrollLeft).to.eq(releasedLeft);
        expect(win.getSelection()?.toString()).to.eq("");
      });
      cy.get('button[aria-label="Zoom out"]').click();
      cy.get(viewportSelector).should(($viewport) => {
        const viewport = $viewport[0]!;
        expect(viewport.scrollLeft).to.be.closeTo(
          (viewport.scrollWidth - viewport.clientWidth) / 2,
          1
        );
        expect(viewport.scrollTop).to.be.closeTo(
          (viewport.scrollHeight - viewport.clientHeight) / 2,
          1
        );
      });
      cy.get('img[alt^="ASCII preview"]')
        .should("have.attr", "src", `data:image/png;base64,${png}`)
        .and("have.attr", "draggable", "false");
      cy.get("@convert.all").should("have.length", 1);
      cy.contains("button", "Download PNG").click();
      cy.readFile(
        "../../artifacts/cypress/downloads/navigation.png",
        "base64"
      ).should("eq", png);
      cy.screenshot("preview-navigation", { capture: "fullPage" });
      cy.get('button[aria-label="Reset to default"]').click();
      cy.get(viewportSelector).should(($viewport) => {
        expect($viewport[0]!.scrollLeft).to.eq(0);
        expect($viewport[0]!.scrollTop).to.eq(0);
      });
    });
  });
});
