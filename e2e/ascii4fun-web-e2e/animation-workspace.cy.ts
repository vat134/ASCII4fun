import {
  columns,
  pngPixels,
  previewPixels,
  uploadImage
} from "./workspace-actions";

// Authored 4x4 red/lime/blue partial-frame fixture, generated with Magick.NET.
const gif =
  "R0lGODlhBAAEAPAAAP8AAAAAACH/C05FVFNDQVBFMi4wAwECAAAh+QQEAwAAACwAAAAABAAEAAACBISPCQUAIfkEDAcAAAAsAQABAAIAAgCAAP8AAAAAAgKEUQAh+QQICwAAACwDAAMAAQABAIAAAP8AAAACAkQBADs=";

function uploadGif(iterations?: number) {
  const contents = Cypress.Buffer.from(gif, "base64");
  if (iterations !== undefined)
    contents.writeUInt16LE(iterations, contents.indexOf("NETSCAPE2.0") + 13);
  cy.get("#image-upload").selectFile(
    {
      contents,
      fileName: "motion.gif",
      mimeType: "image/gif"
    },
    { force: true }
  );
  cy.contains("button", "PNG current frame", { timeout: 30000 }).should(
    "be.enabled"
  );
}

describe("Animated GIF workspace", () => {
  it("copies and downloads the displayed frame text while playback continues", () => {
    const texts = new Map<number, string>();
    let copied = "",
      copySnapshot = "",
      downloadSnapshot = "";
    let download: Promise<Blob> | undefined;
    cy.visit("/", {
      onBeforeLoad(win) {
        const Worker = win.Worker;
        win.Worker = class extends Worker {
          constructor(url: string | URL, options?: WorkerOptions) {
            super(url, options);
            this.addEventListener("message", ({ data }) => {
              if (data.value?.animation)
                texts.set(data.value.animation.frameIndex, data.value.text);
            });
          }
        };
        Object.defineProperty(win.navigator, "clipboard", {
          value: {
            writeText: async (text: string) => {
              copied = text;
            }
          }
        });
        win.document.addEventListener(
          "click",
          (event) => {
            const button = (event.target as Element).closest("button");
            const frame = win.document
              .querySelector('[aria-label="Animation playback"]')
              ?.textContent?.match(/Frame (\d+) \/ /);
            if (!frame) return;
            const text = texts.get(Number(frame[1]) - 1)!;
            if (button?.getAttribute("aria-label") === "Copy text")
              copySnapshot = text;
            if (button?.textContent?.includes("TXT current frame"))
              downloadSnapshot = text;
          },
          true
        );
        win.HTMLAnchorElement.prototype.click = function () {
          expect(this.download).to.eq("motion.txt");
          download = win.fetch(this.href).then((response) => response.blob());
        };
      }
    });
    uploadGif(0);
    cy.get('[aria-label="Copy text"]').should("be.enabled").click();
    cy.then(() => {
      expect(copySnapshot).not.to.eq("");
      expect(copied).to.eq(copySnapshot);
    });
    cy.contains("button", "TXT current frame").should("be.enabled").click();
    cy.then(async () => {
      expect(downloadSnapshot).not.to.eq("");
      expect(await (await download!).text()).to.eq(downloadSnapshot);
    });
    cy.contains("button", "Pause").should("be.visible");
  });
  it("explains non-JSON export failures and allows a successful retry", () => {
    let downloads = 0;
    cy.visit("/", {
      onBeforeLoad(win) {
        win.HTMLAnchorElement.prototype.click = () => downloads++;
      }
    });
    uploadGif();
    cy.intercept("POST", "/api/animations/convert", {
      statusCode: 503,
      headers: { "content-type": "text/plain" },
      body: "Server unavailable"
    }).as("unavailableExport");
    cy.contains("button", "Download GIF").click();
    cy.wait("@unavailableExport");
    cy.get('[role="alert"]').should("contain.text", "HTTP 503");
    cy.intercept("POST", "/api/animations/convert", {
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: "<!doctype html><html>Old app server</html>"
    });
    cy.contains("button", "Download GIF").click();
    cy.get('[role="alert"]').should("contain.text", "unexpected response");
    cy.intercept("POST", "/api/animations/convert", (request) =>
      request.continue()
    ).as("retryExport");
    cy.contains("button", "Download GIF").click();
    cy.wait("@retryExport").its("response.statusCode").should("eq", 200);
    cy.wrap(null).should(() => expect(downloads).to.eq(1));
    cy.get('[role="alert"]').should("not.exist");
  });
  it("keeps moving while columns change and preserves a manual pause", () => {
    cy.visit("/");
    uploadGif(0);
    cy.window().then(async (win) => {
      const frames = new Set<string>();
      const range = win.document.querySelector<HTMLInputElement>(
        'input[type="range"][aria-labelledby="grid-columns-label"]'
      )!;
      const setValue = Object.getOwnPropertyDescriptor(
        win.HTMLInputElement.prototype,
        "value"
      )!.set!;
      for (let index = 0; index < 20; index++) {
        setValue.call(range, 80 + index * 2);
        range.dispatchEvent(new win.Event("input", { bubbles: true }));
        range.dispatchEvent(new win.Event("change", { bubbles: true }));
        await new Promise((resolve) => win.setTimeout(resolve, 50));
        const controls = win.document.querySelector(
          '[aria-label="Animation playback"]'
        )!;
        expect(controls.textContent).to.include("Pause");
        frames.add(controls.textContent!.match(/Frame \d+ \/ \d+/)![0]);
      }
      expect(
        frames.size,
        "moving frames during live Columns changes"
      ).to.be.greaterThan(1);
    });
    cy.get('canvas[role="img"]').should(
      "have.attr",
      "aria-label",
      "ASCII preview, 118 columns by 59 rows"
    );
    cy.contains("button", "Pause").click();
    cy.get("#grid-columns").clear().type("80{enter}");
    cy.get('canvas[role="img"]')
      .should("have.attr", "aria-label")
      .and("include", "80 columns");
    cy.contains("button", "Play").should("be.visible");
  });
  it("rejects a frame outside the logical canvas and recovers on Clear", () => {
    cy.visit("/");
    const bytes = Cypress.Buffer.from(gif, "base64");
    bytes[6] = 2;
    cy.get("#image-upload").selectFile(
      { contents: bytes, fileName: "invalid.gif", mimeType: "image/gif" },
      { force: true }
    );
    cy.get('[role="alert"]', { timeout: 30000 }).should(
      "contain.text",
      "outside its logical canvas"
    );
    cy.contains("button", "Clear").click();
    uploadGif();
  });
  it("pauses, seeks, adjusts cadence and exports the displayed PNG and timed GIF", () => {
    const downloads: { name: string; blob: Promise<Blob> }[] = [];
    cy.viewport(1440, 1000);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.HTMLAnchorElement.prototype.click = function () {
          downloads.push({
            name: this.download,
            blob: win.fetch(this.href).then((response) => response.blob())
          });
        };
      }
    });
    uploadGif();
    cy.contains("button", "Play").should("be.visible"); // Three finite plays finish naturally.
    cy.get('[aria-label="Copy text"]').should("be.enabled");
    cy.contains("button", "TXT current frame").should("be.enabled");
    cy.get('input[aria-labelledby="animation-position-label"]')
      .focus()
      .type("{end}");
    cy.contains("Frame 3 / 3").should("be.visible");
    cy.readFile("fixtures/gif-disposal-native.png", "base64").then((native) => {
      cy.window().then(async (win) => {
        const actual = previewPixels(win);
        const expected = await pngPixels(
          win,
          new win.Blob([Cypress.Buffer.from(native, "base64")], {
            type: "image/png"
          }),
          actual
        );
        let differences = 0;
        for (let index = 0; index < actual.data.length; index++)
          if (actual.data[index] !== expected.data[index]) differences++;
        expect(differences, "native/browser disposal frame pixels").to.eq(0);
      });
    });
    cy.contains("button", "PNG current frame").click();
    cy.wrap(downloads).should("have.length", 1);
    cy.window().then(async (win) => {
      const displayed = previewPixels(win);
      const png = await pngPixels(win, await downloads[0]!.blob, displayed);
      let differences = 0;
      for (let index = 0; index < png.data.length; index++)
        if (png.data[index] !== displayed.data[index]) differences++;
      expect(differences, "downloaded PNG matches the paused frame").to.eq(0);
    });
    cy.get('[aria-label="Playback speed"]').select("2");
    cy.get('input[aria-labelledby="animation-fps-label"]')
      .should("have.attr", "aria-valuetext", "14.29 FPS · Original")
      .focus()
      .type("{home}" + "{rightarrow}".repeat(9));
    cy.get("#animation-fps-value").should("have.text", "10 FPS");
    cy.contains("Frame 1 / 1").should("be.visible");
    cy.contains("0.11 s").should("be.visible");
    cy.contains("button", "Download GIF").click();
    cy.wrap(downloads, { timeout: 30000 }).should("have.length", 2);
    cy.then(async () => {
      const bytes = new Uint8Array(
        await (await downloads[1]!.blob).arrayBuffer()
      );
      expect(new TextDecoder().decode(bytes.slice(0, 6))).to.eq("GIF89a");
      expect(downloads[1]!.name).to.eq("motion.gif");
    });
    cy.get('input[aria-labelledby="animation-fps-label"]')
      .focus()
      .type("{end}");
    cy.get("#animation-fps-value").should("have.text", "14.29 FPS · Original");
    cy.get('[aria-label="Playback speed"]').select("1");
    cy.contains("Frame 1 / 3").should("be.visible");
    cy.contains("button", "Play").click();
    cy.contains("button", "Pause").click();
    cy.get('[aria-label="Remove image"]').click();
    cy.get('[aria-label="Animation playback"]').should("not.exist");
    uploadImage();
    columns(40);
    cy.contains("button", "Download .txt").should("be.enabled");
  });

  it("starts paused with reduced motion and keeps controls inside a narrow viewport", () => {
    cy.viewport(360, 800);
    cy.visit("/", {
      onBeforeLoad(win) {
        const native = win.matchMedia.bind(win);
        win.matchMedia = (query) => {
          const media = native(query);
          if (query === "(prefers-reduced-motion: reduce)")
            Object.defineProperty(media, "matches", { value: true });
          return media;
        };
      }
    });
    uploadGif();
    cy.contains("button", "Play").should("be.visible");
    cy.contains("Frame 1 / 3").should("be.visible");
    cy.document().then((doc) =>
      expect(doc.documentElement.scrollWidth).to.be.at.most(360)
    );
    cy.get('[aria-label="Playback speed"]').select("0.5");
    cy.contains("0.42 s").should("be.visible");
  });
});
