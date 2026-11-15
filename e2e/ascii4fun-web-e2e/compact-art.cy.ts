import {
  pngPixels,
  previewPixels,
  transparentImageBase64
} from "./workspace-actions";

const workspace = '[data-workspace="mini-art"]';
const preview = `${workspace} [aria-label="Mini art preview"]`;
const settings = `${workspace} [aria-label="Mini art settings"]`;

function ready() {
  cy.get(`${preview}[aria-busy="false"]`, { timeout: 30000 }).should(
    "contain.text",
    "Ready"
  );
  cy.get(`${preview} [role="alert"]`).should("not.exist");
}

function select(label: string, option: string) {
  cy.get(`${settings} [role="group"][aria-label="${label}"] button`)
    .contains(option)
    .click();
}

function open() {
  cy.get('[role="tab"]').filter(":visible").contains("Mini art").click();
  cy.get(`${workspace} input[aria-label="Upload mini art image"]`, {
    timeout: 30000
  }).selectFile(
    {
      contents: Cypress.Buffer.from(transparentImageBase64, "base64"),
      fileName: "subject.png",
      mimeType: "image/png"
    },
    { force: true }
  );
  ready();
}

describe("Compact Mini art", () => {
  it("keeps compact artwork, four visible destinations and copies one Twitch message", () => {
    cy.viewport(1440, 1000);
    cy.visit("/", {
      onBeforeLoad(win) {
        cy.stub(win.navigator.clipboard, "writeText")
          .as("clipboard")
          .resolves();
      }
    });
    open();
    cy.get(preview)
      .should("contain.text", "25 × 13")
      .and("contain.text", "987 / 1000 bytes");
    cy.get(`${preview} canvas[role="img"]`).should(($grid) => {
      const rectangle = $grid[0]!.getBoundingClientRect();
      expect(rectangle.width / rectangle.height).to.be.within(0.9, 1.2);
      expect(rectangle.width).to.be.within(220, 230);
    });
    cy.get(settings).should("not.contain.text", "Blank cells");
    cy.get(
      `${settings} [role="group"][aria-label="Destination"] button`
    ).should("have.length", 4);
    cy.get(`${settings} [role="group"][aria-label="Look"] svg`).should(
      "have.length",
      5
    );
    cy.get(`${settings} [role="combobox"]`).should("not.exist");
    cy.get(`${workspace} [role="tab"]`)
      .contains("Text")
      .then(($text) => {
        const text = $text[0]!.getBoundingClientRect();
        cy.get(`${workspace} [role="tab"]`)
          .contains("Media")
          .then(($media) => {
            const media = $media[0]!.getBoundingClientRect();
            expect(text.top).to.eq(media.top);
            cy.get(`${workspace} [role="tab"]`)
              .contains("Mini art")
              .should(($mini) => {
                const mini = $mini[0]!.getBoundingClientRect();
                expect(mini.top).to.be.greaterThan(text.top);
                expect(mini.width).to.be.greaterThan(text.width * 1.8);
              });
          });
      });
    cy.screenshot("mini-art-steam-comment");
    cy.get(`${settings} input[aria-label="Mini art columns"]`).should(
      "have.value",
      "25"
    );
    cy.get(
      `${settings} button[aria-label="Increase mini art columns"]`
    ).click();
    ready();
    cy.get(preview)
      .should("contain.text", "26 × 14")
      .and("contain.text", "105 bytes over limit");
    cy.get(`${settings} button[aria-label="Steam"]`).should(
      "contain.text",
      "Over limit"
    );
    cy.get(`${settings} button[aria-label="Telegram"]`).should(
      "contain.text",
      "May wrap"
    );
    cy.get(`${settings} button[aria-label="Twitch"]`).should(
      "contain.text",
      "Fits"
    );
    cy.get(`${settings} button`)
      .contains(/^Auto$/)
      .click();
    ready();
    cy.get(
      `${settings} button[aria-label="Decrease mini art columns"]`
    ).click();
    ready();
    cy.get(preview)
      .should("contain.text", "24 × 13")
      .and("contain.text", "52 bytes left");
    cy.get(`${settings} input[aria-label="Mini art columns"]`)
      .clear()
      .type("4{enter}");
    ready();
    cy.get(preview)
      .should("contain.text", "4 × 2")
      .and("contain.text", "Columns: 4–200");
    cy.get(`${settings} button`)
      .contains(/^Auto$/)
      .click();
    ready();
    cy.get(`${settings} [aria-label="Look"] svg text`).should(($rows) => {
      for (const row of $rows.toArray()) {
        const text = row as unknown as SVGTextContentElement;
        for (let column = 0; column < text.getNumberOfChars(); column++)
          expect(
            text.getStartPositionOfChar(column).x,
            "fixed Braille column including blanks"
          ).to.be.closeTo(column * 12, 0.01);
      }
    });
    cy.get(`${settings} [aria-label="Steam field"]`)
      .contains("Summary")
      .click();
    ready();
    cy.get(preview).should("contain.text", "/ 4000 bytes");
    cy.get(`${settings} [aria-label="Steam field"]`)
      .contains("Info box")
      .click();
    ready();
    cy.get(preview).should("contain.text", "/ 8000 bytes");
    select("Destination", "Telegram");
    ready();
    cy.get(`${settings} [aria-label="Steam field"]`).should("not.exist");
    cy.get(preview).should("contain.text", "Telegram");
    cy.contains("Estimated paste appearance").should("not.exist");
    cy.screenshot("mini-art-telegram");
    select("Destination", "Twitch");
    ready();
    cy.get(`${preview} button`).contains("Copy text").click();
    cy.get("@clipboard").should("have.been.calledOnce");
    cy.get("@clipboard").then((stub) => {
      const copied = (stub as unknown as { firstCall: { args: string[] } })
        .firstCall.args[0]!;
      expect(copied).not.to.contain("\n");
      expect(copied).to.have.length(495);
    });
    cy.screenshot("mini-art-twitch");
    cy.get(`${workspace} [role="tab"]`).contains("Media").click();
    cy.get('[data-workspace="media"] [role="tab"]')
      .contains("Mini art")
      .click();
    ready();
    cy.get(preview).should("contain.text", "Twitch");
    cy.viewport(320, 860);
    cy.get(settings).scrollIntoView();
    cy.document().should((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(320)
    );
    cy.screenshot("mini-art-mobile", { capture: "viewport" });
  });

  it("matches the native raster, exports PNG/TXT and exposes every look and dither", () => {
    let download: Promise<Blob> | undefined;
    let destinationText = "";
    cy.viewport(1440, 1000);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.HTMLAnchorElement.prototype.click = function () {
          download = win.fetch(this.href).then((response) => response.blob());
        };
      }
    });
    open();
    select("Destination", "File");
    ready();
    cy.get(`${preview} canvas[role="img"]`).should(($canvas) => {
      const rectangle = $canvas[0]!.getBoundingClientRect();
      expect(rectangle.width).to.be.within(400, 440);
      expect(rectangle.height).to.be.within(400, 440);
    });
    cy.request("/api/compact/options").then(({ body }) => {
      cy.window().then(async (win) => {
        const configuration = await win
          .fetch("/api/images/options")
          .then((response) => response.json());
        const form = new win.FormData();
        form.append(
          "image",
          new win.Blob(
            [Cypress.Buffer.from(transparentImageBase64, "base64")],
            { type: "image/png" }
          ),
          "subject.png"
        );
        form.append(
          "settings",
          JSON.stringify({ ...body.defaultOptions, destination: "plain" })
        );
        const response = await win.fetch("/api/compact/convert", {
          method: "POST",
          headers: { "X-CSRF-TOKEN": configuration.requestToken },
          body: form
        });
        expect(response.ok).to.eq(true);
        const native = await response.json();
        destinationText = native.payload.text;
        const displayed = previewPixels(win);
        const png = await pngPixels(
          win,
          new Blob([Cypress.Buffer.from(native.png, "base64")], {
            type: "image/png"
          }),
          displayed
        );
        let differences = 0;
        for (let index = 0; index < png.data.length; index++)
          if (png.data[index] !== displayed.data[index]) differences++;
        expect(differences, "native/browser compact PNG pixels").to.eq(0);
      });
    });
    cy.get(`${workspace} button`).contains("Download PNG").click();
    cy.window().then(async (win) => {
      expect(download).not.to.eq(undefined);
      const displayed = previewPixels(win);
      const png = await pngPixels(win, await download!, displayed);
      let differences = 0;
      for (let index = 0; index < png.data.length; index++)
        if (png.data[index] !== displayed.data[index]) differences++;
      expect(differences, "download matches the full grid").to.eq(0);
    });
    cy.get(`${workspace} button`).contains("Download .txt").click();
    cy.then(async () =>
      expect(await (await download!).text()).to.eq(destinationText)
    );
    cy.screenshot("mini-art-file");
    for (const look of ["Texture", "Sketch", "Soft", "Poster"]) {
      select("Look", look);
      ready();
    }
    for (const dither of ["Floyd–Steinberg", "Bayer", "Threshold"]) {
      select("Dither", dither);
      ready();
    }
    cy.get(`${settings} summary`).click();
    cy.get(
      `${settings} input[type="range"][aria-labelledby="compact-gamma-label"]`
    )
      .focus()
      .type("{end}");
    ready();
    cy.get(`${settings} [aria-label="Detail settings"]`).should(
      "contain.text",
      "3.00"
    );
    cy.get(`${settings} button[aria-label="Reset mini art settings"]`).click();
    ready();
    cy.get(preview).should("contain.text", "987 / 1000 bytes");
  });

  it("rejects unsupported sources and excessive sample grids, then recovers", () => {
    cy.visit("/");
    cy.get('[role="tab"]').filter(":visible").contains("Mini art").click();
    const upload = `${workspace} input[aria-label="Upload mini art image"]`;
    cy.get(upload, { timeout: 30000 }).selectFile(
      {
        contents: Cypress.Buffer.from(""),
        fileName: "empty.png",
        mimeType: "image/png"
      },
      { force: true }
    );
    cy.get(`${preview} [role="alert"]`).should("contain.text", "non-empty");
    cy.get(upload).selectFile(
      {
        contents: Cypress.Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64"
        ),
        fileName: "still.gif",
        mimeType: "image/gif"
      },
      { force: true }
    );
    cy.get(`${preview} [role="alert"]`).should("contain.text", "signature");
    select("Destination", "File");
    cy.get(`${settings} summary`).click();
    select("Crop", "Full image");
    cy.get(`${settings} input[aria-label="Mini art columns"]`)
      .clear()
      .type("4{enter}");
    cy.window().then((win) => {
      const source = win.document.createElement("canvas");
      source.width = 10;
      source.height = 10000;
      const bytes = Cypress.Buffer.from(
        source.toDataURL("image/png").split(",")[1]!,
        "base64"
      );
      cy.get(upload).selectFile(
        { contents: bytes, fileName: "tall.png", mimeType: "image/png" },
        { force: true }
      );
    });
    cy.get(`${preview} [role="alert"]`, { timeout: 30000 }).should(
      "contain.text",
      "bounded sample grid"
    );
    cy.get(`${workspace} button`)
      .contains("Download PNG")
      .should("be.disabled");
    cy.get(`${settings} button[aria-label="Reset mini art settings"]`).click();
    cy.get(upload).selectFile("fixtures/large-portrait.jpg", { force: true });
    ready();
    cy.screenshot("mini-art-portrait-steam");
  });
});
