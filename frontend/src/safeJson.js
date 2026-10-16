/** Parse JSON from fetch; empty proxy bodies (backend down) fail clearly instead of "Unexpected end of JSON". */
export async function readResponseJson(response) {
  const text = await response.text();
  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(
        `Server error (${response.status}). Start the backend (port 8080) with npm run dev in the project root.`
      );
    }
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from server (${response.status}). Check that the API is running.`);
  }
}
