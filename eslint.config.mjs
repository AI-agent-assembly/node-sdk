import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "native/**/target/**",
      "native/aa-ffi-node/index.cjs",
      "native/aa-ffi-node/index.d.ts"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.build.json", "./tsconfig.test.json"]
      }
    }
  }
);
