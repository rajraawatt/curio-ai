import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".json": "application/json",
  ".webm": "video/webm",
};

function serveGenerated() {
  const root = path.resolve(__dirname, "public/generated");
  return {
    name: "serve-generated",
    configureServer(server) {
      server.middlewares.use("/generated", (req, res, next) => {
        const raw = decodeURIComponent(String(req.url || "").split("?")[0]);
        const file = path.resolve(root, `.${raw}`);
        if (!file.startsWith(`${root}${path.sep}`)) return next();
        fs.stat(file, (err, stat) => {
          if (err || !stat.isFile()) return next();
          res.setHeader("Content-Type", GENERATED_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
          fs.createReadStream(file).pipe(res);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [serveGenerated(), react(), tailwindcss()],
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
        // Studio generation streams for a long time
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
