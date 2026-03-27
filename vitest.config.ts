import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    setupFiles: ["src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**"],
      exclude: [
        "src/lib/db.ts",
        "src/lib/meilisearch.ts",
      ],
      thresholds: {
        branches: 20,
        functions: 25,
        lines: 25,
        statements: 25,
      },
    },
  },
});
