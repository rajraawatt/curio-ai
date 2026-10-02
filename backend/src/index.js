import "./env.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { addQuestion, control, currentNarration, publicState, subscribe } from "./classroom.js";
import { generateDiagram, healthInfo, startVeoClip, synthesizeSpeech } from "./gcp.js";
import { prepareCellAssets, readCellPack, MOCK_CELL_SUMMARY } from "./prepareAssets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

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

app.get("/api/prepare/assets", async (_req, res) => {
  try {
    const pack = await readCellPack();
    res.json({
      pack,
      mockSummary: MOCK_CELL_SUMMARY.trim(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/prepare/assets", async (req, res) => {
  const useStream = req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");
  const useGemini = req.body?.useGemini !== false;
  const useVeo = Boolean(req.body?.useVeo);
  const useTripo = Boolean(req.body?.useTripo);
  const reuseExisting = Boolean(req.body?.reuseExisting);
  const objectCount = Number(req.body?.objectCount) || 2;
  const prompt =
    typeof req.body?.prompt === "string" && req.body.prompt.trim()
      ? req.body.prompt.trim()
      : typeof req.body?.summary === "string" && req.body.summary.trim()
        ? req.body.summary.trim()
        : MOCK_CELL_SUMMARY;

  if (useStream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    try {
      send("status", { notice: "Prepare stream started" });
      const pack = await prepareCellAssets({
        prompt,
        useGemini,
        useVeo,
        useTripo,
        reuseExisting,
        objectCount,
        onProgress: async (partial) => {
          send("pack", partial);
        },
      });
      send("done", { ok: true, pack });
    } catch (err) {
      console.error("[prepare]", err);
      send("error", { error: err.message });
    } finally {
      res.end();
    }
    return;
  }

  try {
    const pack = await prepareCellAssets({
      prompt,
      useGemini,
      useVeo,
      useTripo,
      reuseExisting,
      objectCount,
    });
    res.status(201).json({ ok: true, pack });
  } catch (err) {
    console.error("[prepare]", err);
    res.status(500).json({ error: err.message });
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
