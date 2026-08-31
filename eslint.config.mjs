import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // The UI copy is French/Arabic; bare apostrophes and quotes in JSX text
      // are intentional and safe. Escaping all of them adds noise, not safety.
      "react/no-unescaped-entities": "off",
      // Real debt we want visible but not build-blocking yet. Ratchet to
      // "error" once the existing occurrences are typed.
      "@typescript-eslint/no-explicit-any": "warn",
      // These fire on legitimate client-only patterns (setState in a mount
      // effect to read localStorage / matchMedia / window that isn't known
      // during SSR). Kept as warnings so genuine new cases stay visible.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
