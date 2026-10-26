export default {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/ascii4fun-web-tests/**/*.test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/tests/ascii4fun-web-tests/setup-tests.ts"],
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-react", { runtime: "automatic" }],
          "@babel/preset-typescript"
        ]
      }
    ]
  }
};
