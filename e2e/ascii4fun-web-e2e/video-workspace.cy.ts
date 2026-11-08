function uploadVideo(extension: "mp4" | "webm" | "mov", name = "video-sample") {
  cy.get("#image-upload").selectFile(
    `../../tests/ascii4fun-tests/fixtures/${name}.${extension}`,
    { force: true }
  );
  cy.contains("button", "Download MP4", { timeout: 60000 }).should(
    "be.enabled"
  );
  cy.contains("button", "Play").should("be.visible");
}

describe("Video workspace", () => {
  it("plays an entire-minute silent source and rejects longer video without trimming", () => {
    cy.visit("/");
    uploadVideo("mp4", "video-60-seconds");
    cy.get("#animation-fps-value").should("contain.text", "1 FPS");
    cy.contains("button", "Play").click();
    cy.contains('[aria-label="Animation playback"]', /Frame [2-9] \/ 60/, {
      timeout: 10000
    });
    cy.contains("button", "Pause").click();
    cy.get("#image-upload").selectFile(
      "../../tests/ascii4fun-tests/fixtures/video-61-seconds.mp4",
      { force: true }
    );
    cy.get('[role="alert"]').should("contain.text", "60 seconds");
    uploadVideo("mp4");
    cy.get('[aria-label="Copy text"]').should("be.enabled");
  });
  for (const extension of ["mp4", "webm", "mov"] as const) {
    it(`loads ${extension}, keeps live playback and downloads MP4 with sound`, () => {
      const clocks: HTMLAudioElement[] = [];
      let download: Promise<Blob> | undefined;
      cy.visit("/", {
        onBeforeLoad(win) {
          const Audio = win.Audio;
          win.Audio = class extends Audio {
            constructor(source?: string) {
              super(source);
              clocks.push(this);
            }
          };
          win.HTMLAnchorElement.prototype.click = function () {
            expect(this.download).to.eq("video-sample.mp4");
            download = win.fetch(this.href).then((response) => response.blob());
          };
        }
      });
      uploadVideo(extension);
      cy.get("#animation-fps-value").should("contain.text", "10 FPS");
      cy.get('[aria-label="Playback speed"]').select("0.25");
      cy.contains("button", "Play").click();
      cy.wrap(clocks).should((values) => {
        expect(values).to.have.length(1);
        expect(values[0]!.paused).to.eq(false);
        expect(values[0]!.muted).to.eq(false);
        expect(values[0]!.playbackRate).to.eq(0.25);
        expect(values[0]!.currentTime).to.be.greaterThan(0);
      });
      cy.get("#grid-columns").clear().type("24{enter}");
      cy.get('canvas[role="img"]', { timeout: 30000 })
        .should("have.attr", "aria-label")
        .and("include", "24 columns");
      cy.contains("button", "Pause").should("be.visible").click();
      cy.wrap(clocks).should((values) => expect(values[0]!.paused).to.eq(true));
      cy.get('input[aria-labelledby="animation-position-label"]')
        .focus()
        .type("{home}{rightarrow}{rightarrow}");
      cy.wrap(clocks).should((values) =>
        expect(values[0]!.currentTime).to.be.closeTo(0.2, 0.01)
      );
      cy.get('[aria-label="Playback speed"]').select("2");
      cy.get('input[aria-labelledby="animation-fps-label"]')
        .focus()
        .type("{home}{rightarrow}{rightarrow}{rightarrow}{rightarrow}");
      cy.get("#animation-fps-value").should("have.text", "5 FPS");
      if (extension === "mp4") cy.screenshot("video-workspace");
      cy.contains("button", "Download MP4").should("be.enabled").click();
      cy.contains("button", "Cancel export", { timeout: 30000 }).should(
        "not.exist"
      );
      cy.then(() => download!)
        .then((blob) => {
          expect(blob?.type).to.eq("video/mp4");
          expect(blob!.size).to.be.greaterThan(1000);
          return blob!.arrayBuffer();
        })
        .then((buffer) =>
          cy.writeFile(
            `../../artifacts/video-spike/browser-${extension}.mp4`,
            Cypress.Buffer.from(buffer)
          )
        );
    });
  }
});
