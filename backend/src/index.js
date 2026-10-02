import "./env.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { addQuestion, control, currentNarration, publicState, subscribe } from "./classroom.js";
import { generateDiagram, healthInfo, startVeoClip, synthesizeSpeech } from "./gcp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json(healthInfo());
});

app.get("/api/state", (_req, res) => {
  res.json(publicState());
});

app.get("/api/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();
  let unsubscribe = () => {};
  unsubscribe = subscribe((snapshot) => {
    try {
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    } catch {
      unsubscribe();
    }
  });
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  req.on("close", () => {
    clearInterval(ping);
    unsubscribe();
  });
});

app.post("/api/questions", (req, res) => {
  try {
    const question = addQuestion(req.body || {});
    res.status(201).json(question);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/control", async (req, res) => {
  try {
    const { action, ...payload } = req.body || {};
    const snapshot = await control(action, payload);
    res.json(snapshot);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const text = String(req.body?.text || currentNarration() || "").trim();
    if (!text) return res.status(204).end();
    const audio = await synthesizeSpeech(text, req.body?.language || "en");
    if (!audio) return res.status(204).end();
    res.set("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

app.post("/api/diagram", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  await control("diagram", { pending: true, image: null });
  try {
    const image = await generateDiagram(prompt);
    await control("diagram", { pending: false, image, notice: null });
    res.json({ ok: true });
  } catch (err) {
    await control("diagram", { pending: false, image: null, notice: err.message });
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/veo", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  try {
    const operation = await startVeoClip(prompt);
    await control("veo", {
      veo: { status: "started", operation, prompt },
      notice: "Veo accepted the clip. Video generation usually takes a few minutes, so the live lesson keeps using the scene engine.",
    });
    res.json({ ok: true, operation });
  } catch (err) {
    await control("notice", { notice: err.message });
    res.status(502).json({ error: err.message });
  }
});

const dist = process.env.FRONTEND_DIST || path.join(__dirname, "../../frontend/dist");
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
