import { defineConfig } from "cypress";

export default defineConfig({
  screenshotsFolder: "../../artifacts/cypress/screenshots",
  videosFolder: "../../artifacts/cypress/videos",
  video: false,
  e2e: {
    baseUrl: "http://127.0.0.1:5100",
    supportFile: false,
    specPattern: "**/*.cy.ts"
  }
});
