import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["../frontend/src/test/setup.ts"],
    include: ["../frontend/src/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@backend": path.resolve(__dirname, "./src"),
      "@": path.resolve(__dirname, "../frontend/src"),
    },
  },
  server: { fs: { allow: [path.resolve(__dirname, "..")] } },
});
