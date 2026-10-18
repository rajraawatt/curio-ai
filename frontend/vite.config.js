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
          res.setHeader("Accept-Ranges", "bytes");
          const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ""));
          if (!range) {
            res.setHeader("Content-Length", stat.size);
            if (req.method === "HEAD") return res.end();
            return fs.createReadStream(file).pipe(res);
          }
          const suffix = range[1] ? null : Number(range[2]);
          const start = suffix === null ? Number(range[1]) : Math.max(stat.size - suffix, 0);
          const end = range[2] && suffix === null ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
          if (start >= stat.size || start > end) {
            res.statusCode = 416;
            res.setHeader("Content-Range", `bytes */${stat.size}`);
            return res.end();
          }
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${stat.size}`);
          res.setHeader("Content-Length", end - start + 1);
          if (req.method === "HEAD") return res.end();
          return fs.createReadStream(file, { start, end }).pipe(res);
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
