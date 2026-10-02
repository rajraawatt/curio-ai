import { useEffect, useRef, useState } from "react";
import { prefetchCaption, speakCaption, stopCaptionVoice } from "../speech.js";

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
}) {
  const videoRef = useRef(null);
  const speakingRef = useRef(false);
  const finishedRef = useRef(-1);
  const [time, setTime] = useState(0);
  const [reading, setReading] = useState(-1);
  const cues = clipCues(clip);
  const dueIndex = cueIndex(cues, time);
  const line = cueText(cues[reading >= 0 ? reading : dueIndex], lang);
  const src = clip.url.split("?")[0];
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
    <figure className={`prepare-video-card ${compact ? "compact" : ""}`}>
      <div className="prepare-video-frame class-stage-video">
        <video
          ref={videoRef}
          key={clip.url}
          src={src}
          controls
          playsInline
          preload="metadata"
          onPlay={(e) => startNextRef.current(e.currentTarget)}
          onTimeUpdate={(e) => {
            setTime(e.currentTarget.currentTime);
            startNextRef.current(e.currentTarget);
          }}
          onEnded={(e) => setTime(e.currentTarget.duration || e.currentTarget.currentTime)}
          onSeeked={(e) => {
            stopCaptionVoice(e.currentTarget);
            speakingRef.current = false;
            const index = cueIndex(cues, e.currentTarget.currentTime);
            finishedRef.current = index - 1;
            setReading(-1);
            setTime(e.currentTarget.currentTime);
            if (!e.currentTarget.paused) startNextRef.current(e.currentTarget);
          }}
          onPause={(e) => {
            const video = e.currentTarget;
            if (video.ended || video.currentTime >= (video.duration || 8) - 0.2) return;
            speakingRef.current = false;
            stopCaptionVoice(video);
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
        {captions && line && <p className="prepare-caption">{line}</p>}
      </div>
      {!compact && (
        <figcaption>
          {clip.title} ({clip.durationSeconds}s) ·{" "}
          <a href={src} target="_blank" rel="noreferrer">
            open file
          </a>
        </figcaption>
      )}
    </figure>
  );
}
