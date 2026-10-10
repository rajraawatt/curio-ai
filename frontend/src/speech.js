let current;
let lastKey = "";
const speechCache = new Map();
let captionAudio = null;
let captionVideo = null;
let captionVolume = 1;
let captionToken = 0;

function restoreCaptionVideo() {
  if (captionVideo) captionVideo.volume = captionVolume;
  captionVideo = null;
}

function duckCaptionVideo(video) {
  restoreCaptionVideo();
  if (!video) return;
  captionVideo = video;
  captionVolume = video.volume;
  video.volume = 0;
}

function lectureRate(ageGroup) {
  if (ageGroup === "8-10") return 0.96;
  return 1;
}

function loadSpeech(text, lang, ageGroup, speakingRate) {
  const rateKey = speakingRate ? Number(speakingRate).toFixed(2) : "default";
  const key = `${lang}:${ageGroup}:${rateKey}:${text}`;
  const existing = speechCache.get(key);
  if (existing) return existing;
  const job = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      language: lang,
      ageGroup,
      ...(speakingRate ? { speakingRate } : {}),
    }),
  })
    .then(async (response) => {
      if (response.ok && response.headers.get("content-type")?.includes("audio")) {
        return { url: URL.createObjectURL(await response.blob()) };
      }
      speechCache.delete(key);
      return null;
    })
    .catch(() => {
      speechCache.delete(key);
      return null;
    });
  speechCache.set(key, job);
  return job;
}

export function prefetchCaption(text, lang, ageGroup = "11-14") {
  if (!text) return;
  loadSpeech(text, lang, ageGroup);
}

export function stopCaptionVoice(video) {
  if (video && captionVideo && captionVideo !== video) return;
  captionToken += 1;
  captionAudio?.pause();
  captionAudio = null;
  window.speechSynthesis?.cancel();
  restoreCaptionVideo();
}

function femaleBrowserVoice(lang) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const prefix = lang === "hi" ? "hi" : lang === "es" ? "es" : "en";
  const match = voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
  return (
    match.find((voice) => /female|woman/i.test(voice.name))
    || match.find((voice) => !/male|man\b/i.test(voice.name))
    || match[0]
    || null
  );
}

export async function speakCaption(text, lang, video, ageGroup = "11-14", onEnded, speakingRate) {
  if (!text) {
    onEnded?.();
    return;
  }
  const mine = ++captionToken;
  captionAudio?.pause();
  captionAudio = null;
  window.speechSynthesis?.cancel();
  restoreCaptionVideo();
  const finish = () => {
    if (mine !== captionToken) return;
    restoreCaptionVideo();
    onEnded?.();
  };
  const speech = await loadSpeech(text, lang, ageGroup, speakingRate);
  if (mine !== captionToken) return;
  duckCaptionVideo(video);
  if (speech?.url) {
    const audio = new Audio(speech.url);
    captionAudio = audio;
    audio.onended = () => {
      if (captionAudio !== audio) return;
      captionAudio = null;
      finish();
    };
    try {
      await audio.play();
    } catch {
      finish();
    }
    return;
  }
  if (!window.speechSynthesis) {
    finish();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "hi" ? "hi-IN" : lang === "es" ? "es-ES" : "en-US";
  utterance.rate = speakingRate || lectureRate(ageGroup);
  const voice = femaleBrowserVoice(lang);
  if (voice) utterance.voice = voice;
  utterance.onend = () => finish();
  window.speechSynthesis.speak(utterance);
}

function browserVoice(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "hi" ? "hi-IN" : lang === "es" ? "es-ES" : "en-US";
  utterance.rate = lectureRate("11-14");
  const voice = femaleBrowserVoice(lang);
  if (voice) utterance.voice = voice;
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
