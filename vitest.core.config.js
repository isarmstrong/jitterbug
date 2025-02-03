import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["__tests__/ebl/core.test.js"],
        setupFiles: ["__tests__/setup.js"],
    },
}); 