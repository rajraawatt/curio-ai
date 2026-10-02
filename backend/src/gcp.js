import { GoogleAuth } from "google-auth-library";

let auth;

export function projectId() {
  return process.env.GOOGLE_CLOUD_PROJECT || "";
}

export function location() {
  return process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

export function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

export function engineMode() {
  if (projectId()) return "vertex";
  if (apiKey()) return "gemini-api-key";
  return "lesson-scripts";
}

async function accessToken() {
  if (!auth) {
    auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token?.token) {
    throw new Error("No Google Cloud access token. Run: gcloud auth application-default login");
  }
  return token.token;
}

function textFromGemini(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("").trim();
}

export async function geminiGenerate(prompt, { json = false } = {}) {
  const model = geminiModel();
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 4096,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };

  let res;
  if (projectId()) {
    const url = `https://${location()}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${location()}/publishers/google/models/${model}:generateContent`;
    const token = await accessToken();
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } else if (apiKey()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey()}`;
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } else {
    throw new Error("Gemini is not configured");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || JSON.stringify(data).slice(0, 400);
    throw new Error(message || `Gemini request failed (${res.status})`);
  }
  const text = textFromGemini(data);
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export async function generateDiagram(prompt) {
  if (!projectId() && !apiKey()) {
    throw new Error("Image generation needs Vertex AI or a Gemini API key");
  }
  const model = process.env.IMAGEN_MODEL || "gemini-2.5-flash-image";
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Educational classroom diagram, clear, beautiful, no text watermark. ${prompt}`,
          },
        ],
      },
    ],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  };

  let res;
  if (projectId()) {
    const url = `https://${location()}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${location()}/publishers/google/models/${model}:generateContent`;
    const token = await accessToken();
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } else {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey()}`;
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Image generation failed (${res.status})`);
  }
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const image = parts.find((p) => p.inlineData?.data);
  if (!image) throw new Error("The image model returned no image");
  const mime = image.inlineData.mimeType || "image/png";
  return `data:${mime};base64,${image.inlineData.data}`;
}

const VOICE = {
  en: "en-US-Neural2-F",
  hi: "hi-IN-Neural2-A",
  es: "es-ES-Neural2-A",
};

export async function synthesizeSpeech(text, lang = "en") {
  if (!projectId()) return null;
  const token = await accessToken();
  const voiceName = lang === "en" ? process.env.TTS_VOICE || VOICE.en : VOICE[lang] || VOICE.en;
  const languageCode = lang === "hi" ? "hi-IN" : lang === "es" ? "es-ES" : "en-US";
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { text: text.slice(0, 1200) },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.98 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.audioContent) {
    throw new Error(data?.error?.message || "Text-to-Speech failed");
  }
  return Buffer.from(data.audioContent, "base64");
}

export async function translateText(text, target) {
  if (!projectId() || process.env.TRANSLATE_ENABLED !== "true") return null;
  if (!text || target === "en") return text;
  const token = await accessToken();
  const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: text, target, format: "text", source: "en" }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Translation failed");
  return data?.data?.translations?.[0]?.translatedText || text;
}

export async function insertAnalytics(rows) {
  const dataset = process.env.BIGQUERY_DATASET;
  const table = process.env.BIGQUERY_TABLE || "curiosity_events";
  if (!dataset || !projectId() || rows.length === 0) return { skipped: true };
  const token = await accessToken();
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId()}/datasets/${dataset}/tables/${table}/insertAll`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rows: rows.map((row) => ({ insertId: row.insert_id, json: row })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "BigQuery insert failed");
  if (data.insertErrors?.length) {
    throw new Error(JSON.stringify(data.insertErrors[0]).slice(0, 300));
  }
  return { inserted: rows.length };
}

export async function startVeoClip(prompt) {
  if (!projectId()) throw new Error("Veo needs GOOGLE_CLOUD_PROJECT and Application Default Credentials");
  const model = process.env.VEO_MODEL || "veo-3.1-fast-generate-001";
  const token = await accessToken();
  const url = `https://${location()}-aiplatform.googleapis.com/v1/projects/${projectId()}/locations/${location()}/publishers/google/models/${model}:predictLongRunning`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { aspectRatio: "16:9", durationSeconds: 6, sampleCount: 1 },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Veo request failed (${res.status})`);
  return data.name || data;
}

export function healthInfo(extra = {}) {
  return {
    ok: true,
    engine: engineMode(),
    project: projectId() || null,
    location: location(),
    model: geminiModel(),
    imagen: process.env.IMAGEN_MODEL || "gemini-2.5-flash-image",
    veo: process.env.VEO_MODEL || "veo-3.1-fast-generate-001",
    tts: Boolean(projectId()),
    bigquery: Boolean(projectId() && process.env.BIGQUERY_DATASET),
    translate: process.env.TRANSLATE_ENABLED === "true",
    bucket: process.env.GCS_BUCKET || null,
    ...extra,
  };
}
