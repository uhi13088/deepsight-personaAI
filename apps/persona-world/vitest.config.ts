import { defineConfig, mergeConfig } from "vitest/config"
import { createVitestBase } from "@deepsight/config/vitest"

export default mergeConfig(createVitestBase({ rootDir: __dirname }), defineConfig({}))
