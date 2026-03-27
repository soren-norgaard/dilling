import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.component.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
  },
});
