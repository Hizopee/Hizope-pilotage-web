import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Cible de Hizope-pilotage-api en développement. En production, servi en même origine
// via Caddy (basic_auth sur tout le site) — voir hizope-scaleway-deploy/shared-vps/Caddyfile.
const API_TARGET = process.env.VITE_DEV_API_TARGET || "http://localhost:5080";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5176,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
  test: {
    environment: "node",
  },
});
