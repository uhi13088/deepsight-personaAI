import { defineConfig, mergeConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { createVitestBase } from "@deepsight/config/vitest"

export default mergeConfig(
  createVitestBase({ rootDir: __dirname }),
  defineConfig({
    plugins: [react()],
  })
)
