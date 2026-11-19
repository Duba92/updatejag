import path from "node:path";
import { createRequire } from "node:module";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const require = createRequire(import.meta.url);
const { dependencies } = require("./package.json") as {
  dependencies: Record<string, string>;
};

export default defineConfig({
  publicDir: "../frontend/public",
  server: { fs: { allow: [path.resolve(__dirname, "..")] } },
  resolve: {
    dedupe: Object.keys(dependencies),
    alias: {
      "@backend": path.resolve(__dirname, "src"),
      "@": path.resolve(__dirname, "../frontend/src"),
    },
  },
  plugins: [
    tanstackStart({ srcDirectory: "../frontend/src", server: { entry: "server" } }),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
});
