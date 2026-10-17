import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { prefetchCaption, speakCaption, stopCaptionVoice } from "../speech.js";
import { trackAnalytics } from "../analyticsClient.js";
import { freshMediaUrl } from "../mediaReady.js";

function clipCues(clip) {
  if (clip?.merged) {
    return Array.isArray(clip.captions) ? clip.captions : [];
  }
  const raw = Array.isArray(clip?.captions) && clip.captions.length
    ? clip.captions
    : clip?.narration
      ? [{ atSec: 0, text: clip.narration }]
      : [];
  if (raw.length >= 3) {
    return [
      { ...raw[0], atSec: 0 },
      { ...raw[raw.length - 1], atSec: 4.2 },
    ];
  }
  return raw;
}

function captionSpeechSeconds(text, ageGroup) {
  const chars = String(text || "").trim().length;
  const cps = ageGroup === "8-10" ? 11 : 13;
  return Math.min(4, Math.max(1.5, chars / cps));
}

function canStartCue(cues, next, video, lang, ageGroup, clipDuration) {
  const duration = video.duration || clipDuration || 8;
  const t = video.currentTime;
  const scheduled = Number(cues[next]?.atSec ?? 0);
  const last = cues.length - 1;
  if (next === last) {
    const need = captionSpeechSeconds(cueText(cues[next], lang), ageGroup);
    const startBy = Math.max(0, duration - need - 0.3);
    return t + 0.05 >= Math.min(scheduled, startBy);
  }
  return t + 0.05 >= scheduled;
}

function cueText(cue, lang) {
  const text = cue?.text;
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[lang] || text.en || "";
}

function cueIndex(cues, time) {
  let index = -1;
  cues.forEach((cue, i) => {
    if (time + 0.05 >= Number(cue.atSec || 0)) index = i;
  });
  return index;
}

export function LessonClipPlayer({
  clip,
  lang,
  ageGroup,
  captions = true,
  playing,
  compact = false,
  trackStudent,
  trackPlayback,
  trackMode = "self_paced",
  trackAs = "Viewer",
  hideNativeControls = false,
  onSurfaceClick,
  onTime,
  playbackRef,
  onEnded,
  onPlayingChange,
  preload = "metadata",
  deferSrc = false,
  hug = false,
  wide = false,
}) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const speakingRef = useRef(false);
  const finishedRef = useRef(-1);
  const playLoggedRef = useRef("");
  const [time, setTime] = useState(0);
  const [reading, setReading] = useState(-1);
  const cues = clipCues(clip);
  const dueIndex = cueIndex(cues, time);
  const line = cueText(cues[reading >= 0 ? reading : dueIndex], lang);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const src = clip?.url ? freshMediaUrl(clip.url, loadAttempt) : "";
  const poster = clip?.posterUrl ? freshMediaUrl(clip.posterUrl, loadAttempt) : undefined;
  const [videoError, setVideoError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setVideoError("");
    setLoadAttempt(0);
  }, [clip?.url]);

  useEffect(() => {
    if (!videoError || !clip?.url || loadAttempt >= 6) return undefined;
    const timer = setTimeout(() => {
      setVideoError("");
      setLoadAttempt((n) => n + 1);
    }, 450 * (loadAttempt + 1));
    return () => clearTimeout(timer);
  }, [videoError, loadAttempt, clip?.url]);

  useEffect(() => {
    if (!playbackRef) return undefined;
    playbackRef.current = {
      play: () => {
        const video = videoRef.current;
        if (!video) return Promise.resolve();
        if (deferSrc && !video.getAttribute("src")) video.src = src;
        if (video.ended) video.currentTime = 0;
        return video.play();
      },
      pause: () => {
        videoRef.current?.pause();
      },
      seek: (seconds) => {
        const video = videoRef.current;
        if (!video) return;
        const next = Math.max(0, Number(seconds) || 0);
        video.currentTime = next;
      },
    };
    return () => {
      if (playbackRef) playbackRef.current = null;
    };
  });

  if (!src) {
    return <p className="m-0 font-bold text-[#6B7280]">Video URL missing for this clip.</p>;
  }
  const startNextRef = useRef(() => {});

  startNextRef.current = (video) => {
    if (!video || video.ended || speakingRef.current) return;
    const next = finishedRef.current + 1;
    if (next >= cues.length) return;
    if (!canStartCue(cues, next, video, lang, ageGroup, clip.durationSeconds)) return;
    const lineText = cueText(cues[next], lang);
    if (!lineText) {
      finishedRef.current = next;
      startNextRef.current(video);
      return;
    }
    const duration = video.duration || clip.durationSeconds || 8;
    const timeLeft = duration - video.currentTime;
    const need = captionSpeechSeconds(lineText, ageGroup);
    let speakingRate;
    if (timeLeft > 0.25 && need > timeLeft - 0.2) {
      const base = ageGroup === "8-10" ? 0.96 : 1;
      speakingRate = Math.min(1.18, base * (need / timeLeft) * 0.95);
    }
    speakingRef.current = true;
    setReading(next);
    speakCaption(lineText, lang, video, ageGroup, () => {
      speakingRef.current = false;
      finishedRef.current = next;
      setReading(-1);
      startNextRef.current(videoRef.current);
    }, speakingRate);
  };

  useEffect(() => {
    cues.forEach((cue) => prefetchCaption(cueText(cue, lang), lang, ageGroup));
    speakingRef.current = false;
    finishedRef.current = -1;
    setReading(-1);
    const video = videoRef.current;
    if (video && !video.paused) startNextRef.current(video);
    return () => stopCaptionVoice(videoRef.current);
  }, [clip, lang, ageGroup]);

  useEffect(() => {
    playLoggedRef.current = "";
    const video = videoRef.current;
    if (video && !video.paused && !video.ended) logVideoPlay();
  }, [clip.url, lang]);

  const shouldTrack = trackPlayback ?? Boolean(clip.merged || clip.analyticsId === "lesson-merged");

  function logVideoPlay() {
    if (!shouldTrack) return;
    const itemId = clip.analyticsId || clip.id || src.replace(/^.*\//, "").replace(/\?.*$/, "") || "lesson-video";
    const key = `${itemId}:${lang}`;
    if (playLoggedRef.current === key) return;
    playLoggedRef.current = key;
    trackAnalytics({
      event_type: "video_play",
      name: trackStudent || trackAs,
      item_id: itemId,
      item_label: clip.displayLabel || clip.title || "Lesson video",
      language: lang,
      mode: trackMode,
      source: "player",
      value_num: 1,
      concept: clip.fileHint || "",
      pack_id: clip.packId || "cell-mvp",
    });
  }

  function videoIsOffscreen(video) {
    if (!video) return true;
    const full = document.fullscreenElement || document.webkitFullscreenElement;
    if (full && (full === video || full === frameRef.current || full.contains(video))) return false;
    if (video.webkitDisplayingFullscreen) return false;
    return video.offsetParent === null;
  }

  useEffect(() => {
    const sync = () => {
      const full = document.fullscreenElement || document.webkitFullscreenElement;
      setExpanded(full === frameRef.current);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    const full = document.fullscreenElement || document.webkitFullscreenElement;
    if (full === frame) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    const request = frame.requestFullscreen || frame.webkitRequestFullscreen;
    request?.call(frame);
  }

  useEffect(() => {
    if (playing == null) return;
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.play().then(() => logVideoPlay()).catch(() => {});
    } else {
      speakingRef.current = false;
      stopCaptionVoice(video);
      video.pause();
    }
  }, [playing, src]);

  return (
    <figure className={`m-0 font-[inherit] ${wide ? "h-full w-full" : "h-full"}`}>
      <div
        ref={frameRef}
        className={`relative overflow-hidden bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none ${
          wide ? "h-full min-h-[240px] w-full rounded-xl" : `rounded-xl ${hug ? "" : `border border-[#F0EAE0] ${compact ? "min-h-[320px] flex-1" : "min-h-[260px]"}`}`
        }`}
      >
        <video
          ref={videoRef}
          key={src}
          src={deferSrc ? undefined : src}
          poster={poster}
          controls={!hideNativeControls}
          controlsList="nofullscreen"
          playsInline
          preload={preload}
          className={`bg-black ${
            wide
              ? "absolute inset-0 h-full w-full bg-transparent object-cover"
              : `block h-auto w-full ${hug ? "" : compact ? "min-h-[320px] object-contain" : "aspect-video max-h-[420px] object-contain"}`
          }`}
          onError={() => setVideoError("The browser could not play this video file.")}
          onLoadedData={() => setVideoError("")}
          onPlay={(e) => {
            const video = e.currentTarget;
            if (videoIsOffscreen(video)) {
              video.pause();
              stopCaptionVoice(video);
              return;
            }
            onPlayingChange?.(true);
            logVideoPlay();
            startNextRef.current(video);
          }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            if (videoIsOffscreen(video)) {
              video.pause();
              stopCaptionVoice(video);
              return;
            }
            setTime(video.currentTime);
            onTime?.(video.currentTime);
            startNextRef.current(video);
          }}
          onEnded={(e) => {
            setTime(e.currentTarget.duration || e.currentTarget.currentTime);
            onEnded?.();
          }}
          onSeeked={(e) => {
            const video = e.currentTarget;
            const prev = time;
            stopCaptionVoice(video);
            speakingRef.current = false;
            const index = cueIndex(cues, video.currentTime);
            finishedRef.current = index - 1;
            setReading(-1);
            setTime(video.currentTime);
            if (shouldTrack && video.currentTime + 0.5 < prev) {
              trackAnalytics({
                event_type: "rewind",
                name: trackStudent || trackAs,
                item_id: clip.analyticsId || "lesson-merged",
                item_label: clip.displayLabel || clip.title || "Lesson video",
                value_num: Math.round(prev - video.currentTime),
                mode: trackMode,
                source: "player",
                concept: clip.fileHint || "",
                pack_id: clip.packId || "cell-mvp",
              });
            }
            if (!video.paused) startNextRef.current(video);
          }}
          onPause={(e) => {
            const video = e.currentTarget;
            onPlayingChange?.(false);
            if (video.ended || video.currentTime >= (video.duration || 8) - 0.2) return;
            speakingRef.current = false;
            stopCaptionVoice(video);
          }}
        />
        {hideNativeControls && (
          <button
            type="button"
            className="absolute inset-0 cursor-pointer border-0 bg-transparent"
            aria-label="Open the 3D model for this moment"
            onClick={() => onSurfaceClick?.(videoRef.current?.currentTime || 0)}
          />
        )}
        {videoError && (
          <p className="absolute inset-x-3 top-3 m-0 rounded-md bg-black/80 px-3 py-2 text-center text-sm font-bold text-white">
            {videoError}{" "}
            <a href={src} className="underline" target="_blank" rel="noreferrer">
              Open file
            </a>
          </p>
        )}
        {captions && line && (
          <p className="pointer-events-none absolute bottom-14 left-3 right-16 z-10 m-0 px-2.5 py-1.5 text-center text-[0.92rem] font-medium leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
            {line}
          </p>
        )}
        {!hideNativeControls && (
          <button
            type="button"
            className="absolute bottom-3 right-3 z-20 grid h-8 w-8 place-items-center rounded-md bg-black/70 text-white hover:bg-black"
            aria-label={expanded ? "Exit full screen" : "Full screen"}
            onClick={toggleFullscreen}
          >
            {expanded ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        )}
      </div>
      {!compact && !hug && !wide && (
        <figcaption className="mt-1.5 text-[0.8rem] text-[#6B7280]">
          {clip.title} ({clip.durationSeconds}s) ·{" "}
          <a href={src} target="_blank" rel="noreferrer" className="font-extrabold text-[#7C3AED] hover:underline">
            open file
          </a>
        </figcaption>
      )}
    </figure>
  );
}
