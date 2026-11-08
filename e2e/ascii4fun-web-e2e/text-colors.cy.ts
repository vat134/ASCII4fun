import { pngPixels } from "./workspace-actions";

describe("Authored text font colors", () => {
  it("matches native TheDraw PNG, preserves TXT and edits its palette", () => {
    const downloads: Promise<Blob>[] = [];
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
          downloads.push(
            win.fetch(this.href).then((response) => response.blob())
          );
        };
      }
    });
    cy.contains('[role="tab"]:visible', "Text").click();
    const ready = () =>
      cy
        .get('[aria-label="Text preview"]')
        .contains(/^Ready$/, { timeout: 30000 });
    ready();
    cy.contains('[aria-label="Font categories"] button', "TheDraw Color")
      .scrollIntoView()
      .click();
    cy.contains('[aria-label="Fonts"] button', "1911 (TheDraw)")
      .scrollIntoView()
      .click();
    ready();
    cy.get('[aria-label="Text color"]').should("not.exist");
    cy.contains("Use font colors").should("not.exist");
    cy.get('input[aria-label^="Font color #"]').should("have.length", 6);
    cy.get('[aria-label="Text preview"] [aria-label="Copy text"]').click();
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download PNG")
      .click();
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download .txt")
      .click();
    cy.wrap(downloads).should("have.length", 2);
    cy.readFile("fixtures/thedraw-native.png", "base64").then((native) => {
      cy.window().then(async (win) => {
        expect(await (await downloads[1]!).text()).to.eq(copied);
        const blob = await downloads[0]!;
        const actual = await pngPixels(win, blob);
        const expected = await pngPixels(
          win,
          new win.Blob([Cypress.Buffer.from(native, "base64")], {
            type: "image/png"
          })
        );
        expect([actual.width, actual.height]).to.deep.eq([
          expected.width,
          expected.height
        ]);
        let differences = 0;
        for (let i = 0; i < actual.data.length; i++)
          if (actual.data[i] !== expected.data[i]) differences++;
        expect(
          differences,
          "authored foreground and background match native PNG"
        ).to.eq(0);
        const canvas = win.document.querySelector(
          '[aria-label="Text preview"] canvas'
        ) as HTMLCanvasElement;
        const displayed = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height);
        const scaled = await pngPixels(win, blob, displayed);
        differences = 0;
        for (let i = 0; i < displayed.data.length; i++)
          if (displayed.data[i] !== scaled.data[i]) differences++;
        expect(differences, "authored PNG matches displayed preview").to.eq(0);
      });
    });
    cy.screenshot("thedraw-native-colors", { capture: "viewport" });
    cy.get('[aria-label="Font color #0000AA"]').then(($input) => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call($input[0], "#33ffaa");
      $input[0]!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    ready();
    cy.get('[aria-label="Text preview"] [aria-label="Copy text"]').click();
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download PNG")
      .click();
    cy.wrap(downloads).should("have.length", 3);
    cy.window().then(async (win) => {
      expect(await (await downloads[1]!).text()).to.eq(copied);
      const original = await pngPixels(win, await downloads[0]!);
      const custom = await pngPixels(win, await downloads[2]!);
      expect([custom.width, custom.height]).to.deep.eq([
        original.width,
        original.height
      ]);
      let differences = 0;
      for (let i = 0; i < custom.data.length; i++)
        if (custom.data[i] !== original.data[i]) differences++;
      expect(
        differences,
        "custom ink changes pixels without changing glyph geometry"
      ).to.be.greaterThan(0);
      const canvas = win.document.querySelector(
        '[aria-label="Text preview"] canvas'
      ) as HTMLCanvasElement;
      const displayed = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height);
      const scaled = await pngPixels(win, await downloads[2]!, displayed);
      let previewDifferences = 0;
      for (let index = 0; index < displayed.data.length; index++)
        if (displayed.data[index] !== scaled.data[index]) previewDifferences++;
      expect(previewDifferences, "custom palette PNG matches preview").to.eq(0);
    });
    cy.get('[aria-label="Reset text settings"]').click();
    ready();
    cy.get('[aria-label="Font color #0000AA"]').should("have.value", "#0000aa");
    cy.get('[aria-label="Text color"]').should("not.exist");
    cy.get('[aria-label="Text settings"]')
      .contains("button", "Download PNG")
      .click();
    cy.wrap(downloads).should("have.length", 4);
    cy.window().then(async (win) => {
      const original = await pngPixels(win, await downloads[0]!);
      const reset = await pngPixels(win, await downloads[3]!);
      let differences = 0;
      for (let index = 0; index < reset.data.length; index++)
        if (reset.data[index] !== original.data[index]) differences++;
      expect(differences, "reset restores authored PNG").to.eq(0);
    });
  });
});
