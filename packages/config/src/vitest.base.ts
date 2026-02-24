import path from "path"

interface VitestBaseOptions {
  /** Enable coverage reporting (default: true) */
  coverage?: boolean
  /** App root directory for path alias resolution */
  rootDir: string
}

/**
 * Create a shared Vitest config base for all apps.
 * Usage: `mergeConfig(createVitestBase({ rootDir: __dirname }), { ... })`
 */
export function createVitestBase(options: VitestBaseOptions) {
  const { coverage = true, rootDir } = options

  return {
    test: {
      environment: "node" as const,
      globals: true,
      include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
      ...(coverage
        ? {
            coverage: {
              provider: "v8" as const,
              reporter: ["text", "json", "html"] as const,
              include: ["src/lib/**/*.ts", "src/services/**/*.ts"],
              exclude: ["src/**/*.d.ts", "src/types/**"],
            },
          }
        : {}),
    },
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
      },
    },
  }
}
