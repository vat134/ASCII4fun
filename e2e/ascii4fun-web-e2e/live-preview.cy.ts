import { columns, ready, uploadImage } from "./workspace-actions";

function mouse(type: string, x: number, y: number, buttons: number) {
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

describe("Live preview", () => {
  it("renders during a continuous drag and reuses completed settings without a worker conversion", () => {
    let conversions = () => 0;
    let uploads = 0;
    cy.intercept("POST", "/api/images/convert", () => {
      uploads++;
    });
    cy.viewport(1440, 900);
    cy.visit("/", {
      onBeforeLoad(win) {
        const requests = Cypress.sinon.spy(win.Worker.prototype, "postMessage");
        conversions = () =>
          requests.getCalls().filter((call) => call.args[0].type === "convert")
            .length;
      }
    });
    uploadImage();
    ready();
    cy.window().then({ timeout: 10000 }, async (win) => {
      const track = win.document.querySelector('[data-slot="slider-track"]')!;
      const bounds = track.parentElement!.getBoundingClientRect();
      const halfThumb =
        win.document
          .querySelector('[data-slot="slider-thumb"]')!
          .getBoundingClientRect().width / 2;
      const frame = window.parent.document
        .querySelector<HTMLIFrameElement>("iframe.aut-iframe")!
        .getBoundingClientRect();
      const scaleX = frame.width / win.innerWidth;
      const scaleY = frame.height / win.innerHeight;
      const range = win.document.querySelector<HTMLInputElement>(
        'input[type="range"][aria-labelledby="grid-columns-label"]'
      )!;
      const min = Number(range.min),
        max = Number(range.max);
      const x = (width: number) =>
        frame.left +
        (bounds.left +
          halfThumb +
          ((bounds.width - 2 * halfThumb) * (width - min)) / (max - min)) *
          scaleX;
      const y = frame.top + (bounds.top + bounds.height / 2) * scaleY;
      const paints = Cypress.sinon.spy(
        win.CanvasRenderingContext2D.prototype,
        "drawImage"
      );
      await mouse("mouseMoved", x(80), y, 0);
      await mouse("mousePressed", x(80), y, 1);
      for (let width = 81; width <= 120; width++) {
        await mouse("mouseMoved", x(width), y, 1);
        await new Promise((resolve) => win.setTimeout(resolve, 75));
      }
      expect(paints.callCount).to.be.greaterThan(1);
      expect(win.document.querySelector('[role="status"]')).to.eq(null);
      await mouse("mouseReleased", x(120), y, 0);
      paints.restore();
    });
    ready(120);
    columns(80);
    columns(100);
    let before: number;
    cy.then(() => {
      before = conversions();
    });
    columns(80);
    cy.then(() => {
      expect(conversions()).to.eq(before);
      expect(uploads).to.eq(0);
    });
    cy.screenshot("live-preview", { capture: "viewport" });
  });

  it("terminates startup/replaced workers and preserves settings on Clear", () => {
    let created = 0,
      terminated = 0;
    cy.visit("/", {
      onBeforeLoad(win) {
        const Original = win.Worker;
        win.Worker = class extends Original {
          constructor(url: string | URL, options?: WorkerOptions) {
            super(url, options);
            created++;
          }
          terminate() {
            terminated++;
            super.terminate();
          }
        };
      }
    });
    cy.contains("button", "Mono").click();
    uploadImage(undefined, "first.png");
    cy.get('button[aria-label="Remove image"]').click();
    cy.contains("button", "Mono").should("have.attr", "aria-pressed", "true");
    uploadImage(undefined, "second.png");
    uploadImage(undefined, "replacement.png");
    ready();
    cy.contains("replacement.png").should("be.visible");
    cy.then(() => {
      expect(created).to.eq(3);
      expect(terminated).to.eq(2);
    });
  });
});
