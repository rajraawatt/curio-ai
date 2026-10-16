import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: true,
    port: 5173,
    // Prepare writes packs into public/generated; without this Vite full-reloads
    // the app on every still/video/manifest write and wipes the progress UI.
    watch: {
      ignored: [
        "**/public/generated/**",
        "**/frontend/public/generated/**",
        "**/backend/data/**",
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        // Long-lived prepare SSE + classroom EventSource
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
