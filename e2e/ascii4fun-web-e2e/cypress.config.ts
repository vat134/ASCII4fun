import { defineConfig } from "cypress";

export default defineConfig({
  screenshotsFolder: "../../artifacts/cypress/screenshots",
  videosFolder: "../../artifacts/cypress/videos",
  video: false,
  downloadsFolder: "../../artifacts/cypress/downloads",
  e2e: {
    baseUrl: "http://127.0.0.1:5100",
    supportFile: false,
    specPattern: "**/*.cy.ts",
    setupNodeEvents(on) {
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.name === "chrome" && browser.isHeadless) {
          // The headless display must contain our largest desktop test viewport.
          launchOptions.args.push(
            "--window-size=2048,1344",
            "--force-device-scale-factor=1"
          );
        }
        return launchOptions;
      });
    }
  }
});
