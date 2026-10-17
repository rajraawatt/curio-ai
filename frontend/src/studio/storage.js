const HISTORY_KEY = "curio-studio-history";
const DRAFT_KEY = "curio-studio-draft";
const CHATS_KEY = "curio-studio-chats";
const STARRED_KEY = "curio-studio-starred";

export function hasLessonAssets(item) {
  if (!item?.id || String(item.id).startsWith("pending") || item.id === "rocket-saved") return false;
  const urls = [];
  if (item.video?.url) urls.push(item.video.url);
  for (const moment of item.moments || []) {
    for (const image of moment.images || []) {
      if (image?.url) urls.push(image.url);
    }
  }
  return urls.some((url) => String(url).startsWith("/generated/studio/") && !String(url).includes("/1791914535838/"));
}

function readChats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHATS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeChats(chats) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function savedChat(id) {
  const thread = id ? readChats()[id] : null;
  return Array.isArray(thread) ? thread : [];
}

export function storeChat(id, thread) {
  if (!id) return;
  const chats = readChats();
  chats[id] = thread;
  writeChats(chats);
}

export function readDraft() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    return parsed?.session?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const items = Array.isArray(parsed) ? parsed.filter(hasLessonAssets) : [];
    if (Array.isArray(parsed) && items.length !== parsed.length) writeHistory(items);
    return items;
  } catch {
    return [];
  }
}

export function writeHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 24)));
}

export function readStarred() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STARRED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeStarred(ids) {
  localStorage.setItem(STARRED_KEY, JSON.stringify(ids));
}
