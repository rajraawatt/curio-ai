let current;
let lastKey = "";

function browserVoice(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "hi" ? "hi-IN" : lang === "es" ? "es-ES" : "en-US";
  utterance.rate = 0.96;
  window.speechSynthesis.speak(utterance);
}

export function stopNarration() {
  lastKey = "";
  window.speechSynthesis?.cancel();
  current?.pause();
}

export async function narrate(text, lang, key) {
  if (!text || key === lastKey) return;
  lastKey = key;
  window.speechSynthesis?.cancel();
  current?.pause();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2200);
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: lang }),
    });
    if (response.ok && response.headers.get("content-type")?.includes("audio")) {
      const url = URL.createObjectURL(await response.blob());
      current = new Audio(url);
      await current.play();
      return;
    }
  } catch {
    /* Cloud TTS is optional. The browser voice carries the lesson. */
  } finally {
    clearTimeout(timer);
  }
  browserVoice(text, lang);
}

export function listen(lang, onText, onEnd) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    onEnd?.("Voice input needs Chrome or Edge.");
    return null;
  }
  const recognition = new Recognition();
  recognition.lang = lang === "hi" ? "hi-IN" : lang === "es" ? "es-ES" : "en-US";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    if (text) onText(text);
  };
  recognition.onerror = () => onEnd?.("The microphone could not hear that. Try again, or type the question.");
  recognition.onend = () => onEnd?.();
  recognition.start();
  return recognition;
}
