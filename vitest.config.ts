import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["web/src/**/*.test.{ts,tsx}"],
    setupFiles: ["./web/src/test/setup.ts"],
  },
});
