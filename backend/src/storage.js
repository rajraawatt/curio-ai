import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

export function bucketName() {
  const explicit = String(process.env.GCS_BUCKET || "").replace(/^gs:\/\//, "").replace(/\/$/, "");
  if (explicit) return explicit;
  const project = String(process.env.GOOGLE_CLOUD_PROJECT || "").trim();
  return project ? `curio-assets-${project}` : "";
}

async function token() {
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  if (!result?.token) throw new Error("Could not obtain Google Cloud access token");
  return result.token;
}

async function objectResponse(name, { range, method = "GET" } = {}) {
  const bucket = bucketName();
  if (!bucket) throw Object.assign(new Error("GCS_BUCKET is not configured"), { status: 503 });
  const clean = String(name || "").replace(/^\/+/, "");
  if (!clean || clean.split("/").some((part) => !part || part === "." || part === "..")) {
    throw Object.assign(new Error("Invalid asset name"), { status: 400 });
  }
  const headers = { Authorization: `Bearer ${await token()}` };
  if (range) headers.Range = range;
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(clean)}?alt=media`, {
    method,
    headers,
  });
  if (response.status === 404) throw Object.assign(new Error("Asset not found"), { status: 404 });
  if (!response.ok && response.status !== 416) {
    throw Object.assign(new Error(`Cloud Storage read failed (${response.status})`), { status: response.status });
  }
  return response;
}

export async function readObject(name) {
  const response = await objectResponse(name);
  return { body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "application/octet-stream" };
}

function cleanObjectName(name) {
  const clean = String(name || "").replace(/^\/+/, "");
  if (!clean || clean.split("/").some((part) => !part || part === "." || part === "..")) {
    throw Object.assign(new Error("Invalid asset name"), { status: 400 });
  }
  return clean;
}

export async function uploadObject(name, body, contentType = "application/octet-stream") {
  const bucket = bucketName();
  if (!bucket) throw Object.assign(new Error("GCS_BUCKET is not configured"), { status: 503 });
  const clean = cleanObjectName(name);
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const start = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=resumable&name=${encodeURIComponent(clean)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": String(bytes.length),
      },
      body: JSON.stringify({ name: clean, contentType }),
    },
  );
  if (!start.ok) {
    throw Object.assign(new Error(`Cloud Storage upload failed (${start.status})`), { status: start.status === 403 ? 403 : 502 });
  }
  const location = start.headers.get("location");
  if (!location) throw Object.assign(new Error("Cloud Storage upload did not start"), { status: 502 });
  const put = await fetch(location, {
    method: "PUT",
    headers: {
      "Content-Length": String(bytes.length),
      "Content-Type": contentType,
    },
    body: bytes,
  });
  if (!put.ok) {
    throw Object.assign(new Error(`Cloud Storage upload failed (${put.status})`), { status: put.status === 403 ? 403 : 502 });
  }
}

export function streamObject(name, options) {
  return objectResponse(name, options);
}
