import express from "express";
import { getAnalyticsDashboard, recordAnalyticsEvents } from "./analytics.js";

export const analyticsRouter = express.Router();

analyticsRouter.post("/events", async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events : req.body;
    const result = await recordAnalyticsEvents(events);
    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    const detail = error.errors?.flatMap((row) => row.errors || []).map((item) => item.message).filter(Boolean).join("; ") || error.message || "BigQuery event ingestion failed";
    console.error("[analytics] event ingestion failed:", detail);
    res.status(error.status || 503).json({ ok: false, error: detail });
  }
});

analyticsRouter.get("/dashboard", async (req, res) => {
  try {
    const result = await getAnalyticsDashboard({ days: req.query.days, lessonId: req.query.lessonId });
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("[analytics] dashboard query failed:", error.message);
    res.status(error.status || 503).json({
      ok: false,
      configured: false,
      error: error.message,
    });
  }
});
