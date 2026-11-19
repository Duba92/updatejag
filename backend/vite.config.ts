import path from "node:path";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  publicDir: "../frontend/public",
  server: { fs: { allow: [path.resolve(__dirname, "..")] } },
  resolve: {
    dedupe: ["@tanstack/react-query"],
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
