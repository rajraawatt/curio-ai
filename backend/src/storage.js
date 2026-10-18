import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });

export function bucketName() {
  return String(process.env.GCS_BUCKET || "").replace(/^gs:\/\//, "").replace(/\/$/, "");
}

async function token() {
  const client = await auth.getClient();
  const result = await client.getAccessToken();
  if (!result?.token) throw new Error("Could not obtain Google Cloud access token");
  return result.token;
}

export async function readObject(name) {
  const bucket = bucketName();
  if (!bucket) throw Object.assign(new Error("GCS_BUCKET is not configured"), { status: 503 });
  const clean = String(name || "").replace(/^\/+/, "");
  if (!clean || clean.split("/").some((part) => !part || part === "." || part === "..")) {
    throw Object.assign(new Error("Invalid asset name"), { status: 400 });
  }
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(clean)}?alt=media`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (response.status === 404) throw Object.assign(new Error("Asset not found"), { status: 404 });
  if (!response.ok) throw Object.assign(new Error(`Cloud Storage read failed (${response.status})`), { status: response.status });
  return { body: Buffer.from(await response.arrayBuffer()), contentType: response.headers.get("content-type") || "application/octet-stream" };
}
