import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".agents/**",
      ".parcel-cache/**",
      ".parcel-cache-*/**",
      "artifacts/**",
      "dist/**",
      "dist-*/**",
      "docs/project/**",
      "node_modules/**",
      "src/ascii4fun-server/wwwroot/**"
    ]
  },
  {
    files: ["tools/**/*.{cjs,mjs}", ".proxyrc.cjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        URL: "readonly"
      }
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended]
  },
  {
    files: ["src/ascii4fun-web/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended
  },
  {
    files: ["src/ascii4fun-web/**/*.{ts,tsx}"],
    ...reactRefresh.configs.recommended
  },
  {
    files: ["src/ascii4fun-web/**/*.{ts,tsx}"],
    ignores: ["src/ascii4fun-web/ui/base/**"],
    rules: { "max-lines": ["error", 150] }
  }
);
