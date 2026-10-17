import "./env.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { addQuestion, control, currentNarration, publicState, subscribe, trackEvent } from "./classroom.js";
import { generateDiagram, healthInfo, startVeoClip, synthesizeSpeech } from "./gcp.js";
import { prepareCellAssets, readCellPack, MOCK_CELL_SUMMARY } from "./prepareAssets.js";
import { lessonFromBody } from "./preparePrompt.js";
import { askModelTutor } from "./modelTutor.js";
import { generateStudioLesson } from "./studioGenerate.js";
import { buildRocketFiveMinuteLesson } from "./rocketFiveMinuteLesson.js";
import {
  getGalleryLibrary,
  getLearningForClass,
  initGallery,
  rememberLastPrepare,
  savePackToGallery,
  sharePackToLearning,
} from "./gallery.js";

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

app.post("/api/analytics/track", (req, res) => {
  try {
    const snapshot = trackEvent(req.body || {});
    res.json(snapshot);
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

/** 3D model click → Gemini tutor (text; client speaks via /api/tts). */
app.post("/api/model-tutor", async (req, res) => {
  try {
    const result = await askModelTutor(req.body || {});
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
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

app.get("/api/gallery", async (_req, res) => {
  try {
    res.json(await getGalleryLibrary());
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/gallery/save", async (req, res) => {
  try {
    const { classId, subjectId, pack } = req.body || {};
    const saved = await savePackToGallery({ classId, subjectId, pack });
    res.json({ ok: true, pack: saved, library: await getGalleryLibrary() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/gallery/share", async (req, res) => {
  try {
    const { classId, subjectId, packId, pack } = req.body || {};
    const result = await sharePackToLearning({ classId, subjectId, packId, pack });
    if (result.pack) {
      await control("setLearningLesson", { pack: result.pack });
    }
    res.json({ ok: true, ...result, library: await getGalleryLibrary() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get("/api/gallery/learning", async (req, res) => {
  try {
    const classId = String(req.query.classId || "6a");
    res.json(await getLearningForClass(classId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/prepare/assets", async (req, res) => {
  const useStream = req.query.stream === "1" || req.headers.accept?.includes("text/event-stream");
  const useGemini = req.body?.useGemini !== false;
  const useVeo = Boolean(req.body?.useVeo);
  const useTripo = Boolean(req.body?.useTripo);
  const reuseExisting = Boolean(req.body?.reuseExisting);
  const objectCount = Number(req.body?.objectCount) || 2;
  const classId = String(req.body?.classId || "6a");
  const subjectId = String(req.body?.subjectId || "science");
  let lesson;
  try {
    lesson = lessonFromBody(req.body, MOCK_CELL_SUMMARY);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
  const { prompt } = lesson;

  async function persistFinishedPack(pack) {
    if (!pack) return pack;
    const enriched = {
      ...pack,
      status: "done",
      classId,
      subjectId,
      topic: pack.topic || lesson.topic || null,
    };
    await rememberLastPrepare(enriched).catch(() => {});
    await sharePackToLearning({ classId, subjectId, pack: enriched }).catch((err) => {
      console.warn("[gallery] auto-share failed", err.message);
    });
    return enriched;
  }

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
        lesson,
        useGemini,
        useVeo,
        useTripo,
        reuseExisting,
        objectCount,
        onProgress: async (partial) => {
          send("pack", { ...partial, classId, subjectId });
        },
      });
      const finished = await persistFinishedPack(pack);
      send("done", { ok: true, pack: finished });
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
      lesson,
      useGemini,
      useVeo,
      useTripo,
      reuseExisting,
      objectCount,
    });
    const finished = await persistFinishedPack(pack);
    res.status(201).json({ ok: true, pack: finished });
  } catch (err) {
    console.error("[prepare]", err);
    res.status(500).json({ error: err.message });
  }
});


app.post("/api/studio/rocket-five-minute", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (event, data) => res.write(`event: ${event}\\ndata: ${JSON.stringify(data)}\\n\\n`);
  try {
    send("status", { notice: "Starting the five-minute Rocket Launch Mechanics lesson", progress: 1 });
    const result = await buildRocketFiveMinuteLesson({
      onProgress: async ({ notice, progress }) => send("status", { notice, progress })
    });
    send("done", { ok: true, result });
  } catch (err) {
    console.error("[rocket-five-minute]", err);
    send("error", { error: err.message || "Could not build the five-minute lesson" });
  } finally {
    res.end();
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
      onProgress: async ({ notice, progress, session: partial }) => {
        if (notice || progress != null) send("status", { notice, progress });
        if (partial) send("session", { session: partial });
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
initGallery()
  .catch((err) => console.warn("[gallery] init failed", err.message))
  .finally(() => {
    app.listen(port, () => {
      console.log(`CURIO listening on ${port}`);
    });
  });
