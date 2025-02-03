/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/ebl/**/*.test.js"],
    setupFiles: ["__tests__/setup.js"],
    exclude: ["node_modules", ".next", "dist", "build"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", ".next", "dist", "build", "**/__tests__/**"],
    },
  },
});
