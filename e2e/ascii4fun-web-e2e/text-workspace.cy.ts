const textTab = () => cy.contains('[role="tab"]:visible', "Text").click();
const textReady = () =>
  cy.get('[aria-label="Text preview"]').contains(/^Ready$/, { timeout: 30000 });
const cards = () =>
  cy
    .get('[aria-label="Fonts"] button[aria-pressed]')
    .not('[aria-label="Font categories"] button');

describe("FIGlet text workspace", () => {
  it("downloads current UTF-8 text and full-size PNG independently of preview size", () => {
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
    textTab();
    textReady();
    cy.get('[aria-label="Text color"]').then(($input) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call($input[0], "#00ff00");
      $input[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    textReady();
    cy.get('[aria-label="Text preview"] [aria-label="Copy text"]').click();
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download PNG")
      .click();
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download .txt")
      .click();
    cy.get('[aria-label="Text preview"] button[aria-label="Zoom in"]').click();
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download PNG")
      .click();
    cy.wrap(downloads).should("have.length", 3);
    cy.window().then(async (win) => {
      expect(downloads.map((item) => item.name)).to.deep.eq([
        "ascii-text.png",
        "ascii-text.txt",
        "ascii-text.png"
      ]);
      expect(await (await downloads[1]!.blob).text()).to.eq(copied);
      const first = await pngPixels(win, await downloads[0]!.blob);
      const enlarged = await pngPixels(win, await downloads[2]!.blob);
      const rows = copied.split("\n");
      expect([first.width, first.height]).to.deep.eq([
        [...rows[0]!].length * 12,
        rows.length * 24
      ]);
      expect([first.width, first.height]).to.deep.eq([
        enlarged.width,
        enlarged.height
      ]);
      let differences = 0;
      for (let index = 0; index < first.data.length; index++)
        if (first.data[index] !== enlarged.data[index]) differences++;
      expect(differences, "preview size preserves full PNG pixels").to.eq(0);
      expect(
        first.data.some((value, index) => index % 4 === 1 && value > 0)
      ).to.eq(true);
      expect(
        first.data.some(
          (value, index) => (index % 4 === 0 || index % 4 === 2) && value > 0
        )
      ).to.eq(false);
      const displayed = win.document.querySelector(
        '[aria-label="Text preview"] canvas'
      ) as HTMLCanvasElement;
      const expected = await pngPixels(
        win,
        await downloads[0]!.blob,
        displayed
      );
      const actual = displayed
        .getContext("2d")!
        .getImageData(0, 0, displayed.width, displayed.height);
      differences = 0;
      for (let index = 0; index < actual.data.length; index++)
        if (actual.data[index] !== expected.data[index]) differences++;
      expect(differences, "displayed export matches preview").to.eq(0);
    });
    cy.get("#figlet-text").clear();
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download PNG")
      .should("be.disabled");
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download .txt")
      .should("be.disabled");
  });
  it("copies current glyphs and adjusts color and size without changing their layout", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    cy.window().then((window) =>
      cy.stub(window.navigator.clipboard, "writeText").as("copyText").resolves()
    );
    textTab();
    textReady();
    cy.get('[aria-label="Text preview"] [aria-label="Copy text"]')
      .click()
      .should("contain.text", "Copied");
    cy.get('[aria-label="Text preview"] [aria-label="Copy text"]').should(
      "contain.text",
      "Copy text"
    );
    cy.get("@copyText").then((stub) => {
      const copied = (stub as unknown as sinon.SinonStub).firstCall
        .args[0] as string;
      expect(copied).to.contain("\n");
      expect(copied).to.contain(" ");
      expect(copied).not.to.contain("\u2800");
      expect(copied).not.to.contain("\u00a0");
      expect(copied).not.to.equal("ASCII Text");
      cy.wrap(copied).as("glyphs");
    });
    cy.get('[aria-label="Text color"]').then(($input) => {
      const input = $input[0]!;
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call(input, "#00ff00");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    textReady();
    cy.get('[aria-label="Text preview"] canvas')
      .should(($canvas) => {
        const canvas = $canvas[0]! as HTMLCanvasElement;
        const viewport = canvas.parentElement!;
        const bounds = canvas.getBoundingClientRect();
        expect(
          Math.max(
            bounds.width / viewport.clientWidth,
            bounds.height / viewport.clientHeight
          )
        ).to.be.closeTo(0.5, 0.01);
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        expect(
          pixels.some((channel, index) => index % 4 === 1 && channel > 0)
        ).to.equal(true);
        expect(
          pixels.some(
            (channel, index) =>
              (index % 4 === 0 || index % 4 === 2) && channel > 0
          )
        ).to.equal(false);
      })
      .then(($canvas) =>
        cy.wrap($canvas[0]!.getBoundingClientRect().width).as("initialWidth")
      );
    cy.get('[aria-label="Text preview"] button[aria-label="Zoom in"]').click();
    cy.get(
      '[aria-label="Text preview"] output[aria-label="Preview zoom level"]'
    ).should("have.text", "125%");
    cy.get<number>("@initialWidth").then((width) =>
      cy
        .get('[aria-label="Text preview"] canvas')
        .should(($canvas) =>
          expect($canvas[0]!.getBoundingClientRect().width).to.be.closeTo(
            width * 1.25,
            2
          )
        )
    );
    cy.get('[aria-label="Text preview"] [aria-label="Copy text"]').click();
    cy.get<string>("@glyphs").then((glyphs) =>
      cy.get("@copyText").should("have.been.calledWithExactly", glyphs)
    );
    cy.contains('[role="tab"]:visible', "Media").click();
    textTab();
    textReady();
    cy.get('[aria-label="Text color"]').should("have.value", "#00ff00");
    cy.get(
      '[aria-label="Text preview"] output[aria-label="Preview zoom level"]'
    ).should("have.text", "125%");
    cy.get('[aria-label="Reset text settings"]').click();
    textReady();
    cy.get('[aria-label="Text color"]').should("have.value", "#ffffff");
    cy.get(
      '[aria-label="Text preview"] output[aria-label="Preview zoom level"]'
    ).should("have.text", "100%");
    cy.get<number>("@initialWidth").then((width) =>
      cy
        .get('[aria-label="Text preview"] canvas')
        .should(($canvas) =>
          expect($canvas[0]!.getBoundingClientRect().width).to.be.closeTo(
            width,
            2
          )
        )
    );
    cy.get("#figlet-text").clear();
    cy.get('[aria-label="Text preview"] [aria-label="Copy text"]').should(
      "be.disabled"
    );
  });
  it("keeps Retry after a startup failure and a subsequent edit", () => {
    cy.intercept(
      { method: "GET", url: "**/engine-runtime/dotnet.js", times: 1 },
      { forceNetworkError: true }
    );
    cy.visit("/");
    textTab();
    cy.get('[role="alert"]').should("contain.text", "could not start");
    cy.get("#figlet-text").clear().type("Retry this text");
    cy.get('[role="alert"]').should("contain.text", "could not start");
    cy.contains("button", "Retry").click();
    textReady();
    cy.get("#figlet-text").should("have.value", "Retry this text");
  });
  it("preserves a converted image and its settings when visiting Text", () => {
    cy.visit("/");
    uploadImage();
    ready();
    columns(160);
    textTab();
    textReady();
    cy.contains('[role="tab"]:visible', "Media").click();
    cy.get("#grid-columns").should("have.value", "160");
    ready(160);
    cy.get('img[alt="Uploaded source thumbnail"]').should("be.visible");
    cy.contains("button", "Download PNG").should("be.enabled");
  });
  it("renders real font cards, updates text and filters without changing the selected font", () => {
    cy.viewport(1440, 1000);
    cy.visit("/");
    textTab();
    textReady();
    cy.get("#figlet-text").should("have.value", "ASCII Text");
    cy.get('[aria-label="Fonts"]').should("contain.text", "227");
    cards().should(($cards) => expect($cards.length).to.be.within(1, 20));
    cy.get('[aria-label="Text preview"]').then(($preview) => {
      const parent = $preview[0]!.parentElement!;
      expect($preview[0]!.clientHeight / parent.clientHeight).to.be.closeTo(
        0.5,
        0.02
      );
    });
    cards()
      .first()
      .find("canvas")
      .should(($canvas) => {
        const canvas = $canvas[0]! as HTMLCanvasElement;
        const pixels = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        expect(
          pixels.some((channel, index) => index % 4 !== 3 && channel > 0)
        ).to.equal(true);
      });
    cy.screenshot("figlet-first-desktop", { capture: "viewport" });
    cy.get("#figlet-text").clear().type("Hello\nWorld", { delay: 0 });
    cy.get('[aria-label="Font categories"]')
      .contains("button", "Stylized & Retro")
      .click();
    cy.contains("button", /Classy/)
      .focus()
      .should("have.focus");
    cy.press(Cypress.Keyboard.Keys.SPACE);
    textReady();
    cy.get('[aria-label="Font categories"]')
      .contains("button", "3D & Iso")
      .click();
    cards().should("have.length.greaterThan", 0);
    cy.get('[aria-label="Text preview"]').should("contain.text", "Classy");
    cy.get('[aria-label="Font categories"]')
      .contains("button", "All fonts")
      .click();
    cy.contains("button", /Classy/).should("have.attr", "aria-pressed", "true");
    cy.get('[role="tab"]:visible').contains("Media").click();
    cy.contains("button", "Original").should("be.visible");
    textTab();
    textReady();
    cy.get("#figlet-text").should("have.value", "Hello\nWorld");
    cy.contains("button", /Classy/).should("have.attr", "aria-pressed", "true");
    cy.get("#figlet-text").clear();
    cy.contains("Enter text to see your artwork").should("be.visible");
  });

  it("recovers from unsupported characters and virtualizes the full catalog while scrolling", () => {
    cy.visit("/");
    textTab();
    textReady();
    cy.get("#figlet-text").clear().invoke("val", "🙂").trigger("input");
    // Native setter is required for React's controlled-input value tracking.
    cy.get("#figlet-text").then(($input) => {
      const element = $input[0]!;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )!.set!;
      setter.call(element, "Missing 🙂");
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    cy.get('[role="alert"]').should("contain.text", "U+1F642");
    cy.get("#figlet-text").clear().type("ASCII Text");
    textReady();
    for (const position of ["50%", "100%", "0%"] as const) {
      cy.get('[aria-label="Font cards"]').scrollTo(0, position);
      cards().should(($cards) => expect($cards.length).to.be.within(1, 20));
      cards().last().click();
      textReady();
      cy.get('[aria-label="Text preview"] canvas').should("be.visible");
    }
    cy.get('[aria-label="Font cards"]').scrollTo("bottom");
    cy.contains('[aria-label="Font cards"] button', "WPaint (TheDraw)").click();
    textReady();
    cy.get('[aria-label="Text preview"]').should("contain.text", "WPaint");
    cy.get('[aria-label="Font cards"]').scrollTo("top");
    cy.contains('[aria-label="Font cards"] button', "Linguaholic Neon")
      .should("be.visible")
      .focus()
      .should("have.focus");
    cy.press(Cypress.Keyboard.Keys.SPACE);
    textReady();
    cy.contains('[aria-label="Font cards"] button', "Linguaholic Neon").should(
      "be.visible"
    );
    cy.get('[aria-label="Fonts"] canvas').should(($canvases) =>
      expect($canvases.length).to.be.within(1, 32)
    );
    cy.get('[role="alert"]').should("not.exist");
  });

  for (const width of [320, 768]) {
    it(`keeps source, preview and fonts usable at ${width}px`, () => {
      cy.viewport(width, 900);
      cy.visit("/");
      textTab();
      textReady();
      cy.get("#figlet-text").should("be.visible");
      cy.document().then((document) =>
        expect(document.documentElement.scrollWidth).to.be.at.most(width)
      );
      cy.get('[aria-label="Text preview"] [aria-label="Preview zoom"]')
        .scrollIntoView()
        .should("be.visible");
      cy.get('[aria-label="Text preview"] [aria-label="Copy text"]').should(
        "be.visible"
      );
      cy.screenshot(`figlet-preview-${width}`, { capture: "viewport" });
      cy.get('[aria-label="Fonts"]').scrollIntoView();
      cards().first().should("be.visible");
      cy.screenshot(`figlet-first-${width}`, { capture: "fullPage" });
    });
  }
});
import { columns, ready, uploadImage, pngPixels } from "./workspace-actions";
