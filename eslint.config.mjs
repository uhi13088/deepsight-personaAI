import { defineConfig, globalIgnores } from "eslint/config"

// Root ESLint config for monorepo
// Individual apps have their own ESLint configs

const eslintConfig = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "pnpm-lock.yaml",
  ]),
  {
    // Root level JS files
    files: ["*.js", "*.mjs", "*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
])

export default eslintConfig
