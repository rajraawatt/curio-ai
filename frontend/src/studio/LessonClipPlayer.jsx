import { useEffect, useRef, useState } from "react";
import { Crop, FoldHorizontal, Maximize, Minimize, Pause, Play, SkipBack, SkipForward, UnfoldHorizontal, Volume2, VolumeX } from "lucide-react";
import { prefetchCaption, speakCaption, stopCaptionVoice } from "./speech.js";
import { freshMediaUrl } from "./mediaReady.js";

function clipCues(clip) {
  if (clip?.merged) {
    return Array.isArray(clip.captions) ? clip.captions : [];
  }
  const raw = Array.isArray(clip?.captions) && clip.captions.length
    ? clip.captions
    : clip?.narration
      ? [{ atSec: 0, text: clip.narration }]
      : [];
  if ((Number(clip?.durationSeconds) || 0) > 12 && raw.some((cue) => Number(cue.atSec) >= 6)) return raw;
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

function clockLabel(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
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
  hideNativeControls = false,
  onSurfaceClick,
  onTime,
  onPrevious,
  onNext,
  onStretch,
  stretched = false,
  onZoom,
  zoomed = false,
  onCrop,
  onEnded,
  playbackRef,
  autoPlay = false,
  preload = "metadata",
  deferSrc = false,
  hug = false,
  wide = false,
}) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const cropLayerRef = useRef(null);
  const cropDrag = useRef(null);
  const speakingRef = useRef(false);
  const finishedRef = useRef(-1);
  const [time, setTime] = useState(0);
  const [reading, setReading] = useState(-1);
  const fileHasVoice = Boolean(clip?.voiced) || (wide && (Number(clip?.durationSeconds) || 0) > 16);
  const cues = fileHasVoice && !clip?.voiced ? [] : clipCues(clip);
  const dueIndex = cueIndex(cues, time);
  const line = cueText(cues[reading >= 0 ? reading : dueIndex], lang);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const src = clip?.url ? freshMediaUrl(clip.url, loadAttempt) : "";
  const poster = clip?.posterUrl ? freshMediaUrl(clip.posterUrl, loadAttempt) : undefined;
  const [videoError, setVideoError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(clip?.durationSeconds || 0);
  const [fill, setFill] = useState({ scale: 1, origin: 50 });
  const [cropping, setCropping] = useState(false);
  const [cropBox, setCropBox] = useState(null);
  const measuredAt = useRef(0);

  function cropPoint(event) {
    const rect = cropLayerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
    };
  }

  function finishCrop(region) {
    const video = videoRef.current;
    const layer = cropLayerRef.current;
    setCropBox(null);
    setCropping(false);
    if (!video || !layer || !region || region.w < 12 || region.h < 12 || !video.videoWidth) return;
    const rect = layer.getBoundingClientRect();
    const scale = Math.max(rect.width / video.videoWidth, rect.height / video.videoHeight);
    const offsetX = (video.videoWidth * scale - rect.width) / 2;
    const offsetY = (video.videoHeight * scale - rect.height) / 2;
    const sx = Math.max(0, (region.x + offsetX) / scale);
    const sy = Math.max(0, (region.y + offsetY) / scale);
    const sw = Math.min(video.videoWidth - sx, region.w / scale);
    const sh = Math.min(video.videoHeight - sy, region.h / scale);
    if (sw < 4 || sh < 4) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    onCrop?.({
      url: canvas.toDataURL("image/png"),
      from: { x: rect.left + region.x, y: rect.top + region.y, w: region.w, h: region.h },
    });
  }

  function measureFill(video) {
    if (!wide || !video?.videoWidth || video.readyState < 2) return;
    const w = 96;
    const h = Math.max(1, Math.round((w * video.videoHeight) / video.videoWidth));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    try {
      ctx.drawImage(video, 0, 0, w, h);
    } catch {
      return;
    }
    const pixels = ctx.getImageData(0, 0, w, h).data;
    const columnDark = (x) => {
      let total = 0;
      const samples = 6;
      for (let i = 0; i < samples; i += 1) {
        const y = Math.floor(((i + 0.5) / samples) * h);
        const p = (y * w + x) * 4;
        total += pixels[p] + pixels[p + 1] + pixels[p + 2];
      }
      return total / samples < 36;
    };
    let left = 0;
    while (left < w / 2 && columnDark(left)) left += 1;
    let right = w - 1;
    while (right > w / 2 && columnDark(right)) right -= 1;
    const content = right - left + 1;
    const side = Math.max(left, w - 1 - right);
    // A black opening frame looks like bars that meet in the middle and
    // produces a huge zoom. Only crop a thin, stable letterbox.
    if (side < w * 0.04 || content < w * 0.8) {
      setFill((prev) => (prev.scale === 1 ? prev : { scale: 1, origin: 50 }));
      return;
    }
    const scale = Math.min(1.15, w / content);
    const origin = ((left + right) / 2 / w) * 100;
    setFill((prev) => (
      Math.abs(prev.scale - scale) < 0.04 && Math.abs(prev.origin - origin) < 1.5
        ? prev
        : { scale, origin }
    ));
  }
  const [rate, setRate] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);

  function setPlaybackRate(next) {
    setRate(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
  }

  useEffect(() => {
    setVideoError("");
    setLoadAttempt(0);
    setFill({ scale: 1, origin: 50 });
    measuredAt.current = 0;
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
    if (fileHasVoice) return;
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
    speakCaption(lineText, lang, wide ? null : video, ageGroup, () => {
      speakingRef.current = false;
      finishedRef.current = next;
      setReading(-1);
      startNextRef.current(videoRef.current);
    }, speakingRate);
  };

  useEffect(() => {
    if (fileHasVoice) {
      stopCaptionVoice(videoRef.current);
      return undefined;
    }
    cues.forEach((cue) => prefetchCaption(cueText(cue, lang), lang, ageGroup));
    speakingRef.current = false;
    finishedRef.current = -1;
    setReading(-1);
    const video = videoRef.current;
    if (video && !video.paused) startNextRef.current(video);
    return () => stopCaptionVoice(videoRef.current);
  }, [clip, lang, ageGroup]);

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

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      video.play().catch(() => {});
    } else video.pause();
  }

  function seekToClientX(clientX, el) {
    const video = videoRef.current;
    if (!video || !el) return;
    const bounds = el.getBoundingClientRect();
    if (!bounds.width) return;
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    const length = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
    if (length) video.currentTime = ratio * length;
  }

  function scrubBar(event) {
    const el = event.currentTarget;
    seekToClientX(event.clientX, el);
    const move = (next) => seekToClientX(next.clientX, el);
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

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
      video.play().catch(() => {});
    } else {
      speakingRef.current = false;
      stopCaptionVoice(video);
      video.pause();
    }
  }, [playing]);

  return (
    <figure className={`m-0 font-[inherit] ${wide ? "h-full w-full" : "h-full"}`}>
      <div
        ref={frameRef}
        className={`relative overflow-hidden bg-black [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none ${
          wide ? "h-full min-h-[240px] w-full rounded-xl" : `rounded-xl ${hug ? "" : `border border-[#F0EAE0] ${compact ? "min-h-[320px] flex-1" : "min-h-[260px]"}`}`
        }`}
      >
        <div
          className={wide ? "absolute inset-x-0 top-0 z-0 h-[calc(100%-3rem)] w-full" : "contents"}
          style={wide && fill.scale > 1 ? { transform: `scale(${fill.scale})`, transformOrigin: `${fill.origin}% 50%` } : undefined}
        >
        <video
          ref={videoRef}
          key={src}
          src={deferSrc ? undefined : src}
          poster={poster}
          autoPlay={autoPlay}
          controls={!hideNativeControls && !wide}
          controlsList="nofullscreen"
          playsInline
          preload={preload}
          className={`bg-black ${
            wide
              ? "h-full w-full cursor-pointer object-cover"
              : `block h-auto w-full ${hug ? "" : compact ? "min-h-[320px] object-contain" : "aspect-video max-h-[420px] object-contain"}`
          }`}
          onClick={() => {
            if (cropping) return;
            if (wide && !hideNativeControls) togglePlay();
          }}
          onError={() => setVideoError("The browser could not play this video file.")}
          onLoadedData={(e) => {
            setVideoError("");
            e.currentTarget.playbackRate = rate;
            if (e.currentTarget.duration) setDuration(e.currentTarget.duration);
            if (wide) {
              e.currentTarget.volume = volume || 1;
              e.currentTarget.muted = false;
            }
            measureFill(e.currentTarget);
          }}
          onPlay={(e) => {
            const video = e.currentTarget;
            if (videoIsOffscreen(video)) {
              video.pause();
              stopCaptionVoice(video);
              return;
            }
            if (wide) {
              video.volume = volume || 1;
              video.muted = false;
              setSoundOn(true);
            }
            setPaused(false);
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
            if (wide && video.currentTime - measuredAt.current > 0.8) {
              measuredAt.current = video.currentTime;
              measureFill(video);
            }
            startNextRef.current(video);
          }}
          onEnded={(e) => {
            const video = e.currentTarget;
            const expected = Number(clip?.durationSeconds) || 0;
            if (expected > 9 && (video.currentTime || 0) < expected - 1.5) return;
            setTime(video.duration || video.currentTime);
            onEnded?.();
          }}
          onSeeked={(e) => {
            const video = e.currentTarget;
            stopCaptionVoice(video);
            speakingRef.current = false;
            const index = cueIndex(cues, video.currentTime);
            finishedRef.current = index - 1;
            setReading(-1);
            setTime(video.currentTime);
            if (!video.paused) startNextRef.current(video);
            measureFill(video);
          }}
          onPause={(e) => {
            const video = e.currentTarget;
            setPaused(true);
            if (video.ended || video.currentTime >= (video.duration || 8) - 0.2) return;
            speakingRef.current = false;
            stopCaptionVoice(wide ? null : video);
          }}
        />
        {wide && cropping && (
          <div
            ref={cropLayerRef}
            className="absolute inset-0 z-20 cursor-crosshair"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              const start = cropPoint(event);
              if (!start) return;
              cropDrag.current = start;
              setCropBox({ x: start.x, y: start.y, w: 0, h: 0 });
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = cropDrag.current;
              if (!start) return;
              const now = cropPoint(event);
              if (!now) return;
              const next = {
                x: Math.min(start.x, now.x),
                y: Math.min(start.y, now.y),
                w: Math.abs(now.x - start.x),
                h: Math.abs(now.y - start.y),
              };
              start.box = next;
              setCropBox(next);
            }}
            onPointerUp={() => {
              const region = cropDrag.current?.box;
              cropDrag.current = null;
              finishCrop(region);
            }}
          >
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[0.7rem] font-semibold text-white">Drag to crop this moment</span>
            {cropBox && cropBox.w > 0 && (
              <span
                className="pointer-events-none absolute border-2 border-[#c084fc] bg-[#7C3AED]/30"
                style={{ left: cropBox.x, top: cropBox.y, width: cropBox.w, height: cropBox.h }}
              />
            )}
          </div>
        )}
        </div>
        {wide && zoomed && onZoom && (
          <button
            type="button"
            className="absolute left-3 top-3 z-40 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
            aria-label="Exit full video"
            onClick={onZoom}
          >
            <Minimize size={14} /> Exit
          </button>
        )}
        {wide && (
          <div className="pointer-events-none absolute right-3 top-3 z-10 opacity-70">
            <span className="text-sm font-semibold tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">Curio</span>
          </div>
        )}
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
          <p className={`pointer-events-none absolute left-3 right-3 z-10 m-0 px-2.5 py-1.5 text-center text-[0.92rem] font-medium leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)] ${wide ? "bottom-[3.4rem]" : "bottom-14"}`}>
            {line}
          </p>
        )}
        {wide && !hideNativeControls && (
          <div className="absolute inset-x-0 bottom-0 z-30 bg-black px-2 pb-1.5 pt-1 text-white">
            <div
              className="relative mb-1 flex h-4 w-full cursor-pointer items-center"
              aria-label="Seek"
              onPointerDown={scrubBar}
            >
              <div className="relative h-1 w-full rounded-full bg-white/25">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-white"
                  style={{ width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="flex items-center">
              <button type="button" className="grid h-7 w-7 place-items-center disabled:opacity-35" aria-label="Previous moment" disabled={!onPrevious} onClick={onPrevious}>
                <SkipBack size={15} />
              </button>
              <button type="button" className="grid h-7 w-7 place-items-center" aria-label={paused ? "Play" : "Pause"} onClick={togglePlay}>
                {paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
              </button>
              <button type="button" className="grid h-7 w-7 place-items-center disabled:opacity-35" aria-label="Next moment" disabled={!onNext} onClick={onNext}>
                <SkipForward size={15} />
              </button>
              <span className="ml-2 text-[0.75rem] font-medium tabular-nums text-white/90">
                {clockLabel(time)} / {clockLabel(duration)}
              </span>
              <div className="relative ml-auto">
                {rateOpen && (
                  <div className="absolute bottom-9 right-0 w-36 overflow-hidden rounded-lg bg-[#1a1a1a]/95 py-1 text-white shadow-lg">
                    <p className="m-0 px-3 py-1.5 text-[0.68rem] font-semibold text-white/55">Playback speed</p>
                    {[1, 2].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.8rem] font-semibold hover:bg-white/10"
                        onClick={() => {
                          setPlaybackRate(value);
                          setRateOpen(false);
                        }}
                      >
                        <span className="w-3">{rate === value ? "✓" : ""}</span>
                        {value}x
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="grid h-7 min-w-7 place-items-center px-1.5 text-[0.72rem] font-semibold"
                  aria-expanded={rateOpen}
                  aria-label="Playback speed"
                  onClick={() => setRateOpen((open) => !open)}
                >
                  {rate}x
                </button>
              </div>
              <div className="ml-2 flex items-center gap-1.5">
                <button
                  type="button"
                  className="grid h-7 w-7 shrink-0 place-items-center"
                  aria-label={soundOn ? "Sound on" : "Sound off"}
                  onClick={() => {
                    const video = videoRef.current;
                    if (!video || video.paused) return;
                    const nextMuted = !video.muted;
                    video.muted = nextMuted;
                    if (!nextMuted) video.volume = volume || 1;
                    setSoundOn(!nextMuted);
                  }}
                >
                  {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  type="button"
                  className="relative z-10 h-1 w-20 shrink-0 rounded-full bg-white/30"
                  aria-label="Volume"
                  onClick={(event) => {
                    const video = videoRef.current;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const next = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
                    const level = next || 0;
                    if (level > 0) setVolume(level);
                    if (!video) return;
                    video.volume = level || volume;
                    video.muted = level === 0;
                    setSoundOn(level > 0 && !video.paused);
                  }}
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    style={{ width: `${(soundOn ? volume : 0) * 100}%` }}
                  />
                </button>
                {onCrop && (
                  <button
                    type="button"
                    className={`grid h-7 w-7 shrink-0 place-items-center ${cropping ? "text-[#c084fc]" : ""}`}
                    aria-label="Crop this moment"
                    aria-pressed={cropping}
                    onClick={() => {
                      videoRef.current?.pause();
                      setCropBox(null);
                      setCropping((on) => !on);
                    }}
                  >
                    <Crop size={16} />
                  </button>
                )}
                {onStretch && (
                  <button type="button" className="grid h-7 w-7 shrink-0 place-items-center" aria-label={stretched ? "Show sidebars" : "Stretch video"} onClick={onStretch}>
                    {stretched ? <FoldHorizontal size={16} /> : <UnfoldHorizontal size={16} />}
                  </button>
                )}
                {onZoom && (
                  <button type="button" className="grid h-7 w-7 shrink-0 place-items-center" aria-label={zoomed ? "Exit full video" : "Full video"} onClick={onZoom}>
                    {zoomed ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {!hideNativeControls && !wide && (
          <button
            type="button"
            className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-md bg-black/70 text-white hover:bg-black"
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
