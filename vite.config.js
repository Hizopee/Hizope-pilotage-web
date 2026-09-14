import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  // loadEnv (et pas process.env seul) : sinon un .env.development.local ne serait jamais
  // pris en compte ici — vite.config.js tourne avant que Vite n'injecte les fichiers .env
  // dans process.env, ça ne marche que côté client (import.meta.env). Un vrai override
  // shell (`VITE_DEV_API_TARGET=... npm run dev`, cf. README) continue de fonctionner
  // pareil, loadEnv reprend aussi process.env.
  const env = loadEnv(mode, process.cwd(), "");
  // Cible de Hizope-pilotage-api en développement. En production, servi en même origine
  // via Caddy (basic_auth sur tout le site) — voir hizope-scaleway-deploy/shared-vps/Caddyfile.
  const API_TARGET = env.VITE_DEV_API_TARGET || "http://localhost:5080";

  return {
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
  };
});
