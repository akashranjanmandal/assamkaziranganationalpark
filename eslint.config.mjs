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
    // Old static-site reference files kept for provenance only — not part
    // of the Next.js app, never built or served, so they're excluded here.
    "reference-*/**",
    "reference-*.html",
    "reference-*.css",
    "reference-*.sql",
  ]),
]);

export default eslintConfig;
