import "./env.js";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { healthInfo, synthesizeSpeech } from "./gcp.js";
import { askModelTutor } from "./modelTutor.js";
import { generateStudioLesson } from "./studioGenerate.js";
import { readObject } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/api/studio/templates", async (_req, res) => {
  try {
    const asset = await readObject("studio/templates.json");
    res.set("Cache-Control", "no-store");
    res.set("Content-Type", "application/json");
    res.send(asset.body);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Template catalog unavailable" });
  }
});

app.get(/^\\/generated\\/studio\\/(.+)$/, async (req, res, next) => {
  const name = `studio/${req.params[0]}`;
  if (name.split("/").some((part) => !part || part === "." || part === "..")) return res.status(400).json({ error: "Invalid asset path" });
  try {
    const asset = await readObject(name);
    res.set("Content-Type", asset.contentType);
    res.set("Cache-Control", "public, max-age=300");
    return res.send(asset.body);
  } catch (err) {
    if (err.status === 404) return next();
    console.error("[template-asset]", name, err.message);
    return res.status(err.status || 502).json({ error: "Template asset could not be loaded from Cloud Storage" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json(healthInfo());
});

app.post("/api/tts", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(204).end();
    const audio = await synthesizeSpeech(
      text,
      req.body?.language || "en",
      req.body?.ageGroup || "11-14",
      req.body?.speakingRate
    );
    if (!audio) return res.status(204).end();
    res.set("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

app.post("/api/model-tutor", async (req, res) => {
  try {
    const result = await askModelTutor(req.body || {});
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/studio/session/:id", async (req, res) => {
  const id = String(req.params.id || "").replace(/[^\d]/g, "");
  if (!id) return res.status(400).json({ error: "Missing session" });
  const file = path.join(__dirname, "../../frontend/public/generated/studio", id, "session.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ error: "Session not found" });
  }
});

app.post("/api/studio/generate", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  try {
    send("status", { notice: "Studio stream started" });
    const session = await generateStudioLesson({
      prompt,
      onProgress: async ({ notice, progress, done, session: partial, log }) => {
        if (notice || progress != null) send("status", { notice, progress, done, session: partial, log });
        if (partial) send("session", { session: partial, done });
      },
    });
    send("done", { ok: true, session });
  } catch (err) {
    console.error("[studio]", err);
    send("error", { error: err.message });
  } finally {
    res.end();
  }
});

const dist = process.env.FRONTEND_DIST || path.join(__dirname, "../../frontend/dist");
const publicDir = path.join(__dirname, "../../frontend/public");
app.use(express.static(publicDir));
app.use(express.static(dist));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) res.status(404).send("CURIO client is not built yet. Run npm run dev or npm run build.");
  });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`CURIO listening on ${port}`);
});
