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
  }
);
