# CURIO — Product Overview & User Flows

> Intended for product research, ideation, and LLM exploration.  
> Focuses on **what the experience is** and **how people move through it**, not system architecture.

---

## One-line pitch

**CURIO is a teacher-led live classroom where a prepared lesson video is shared with the whole class, students ask questions into that lesson, and the teacher chooses which curiosity the class explores together — with a separate Learning space for self-paced review of what the teacher published.**

Tagline from the lobby: *One shared lesson. Curiosity changes the view.*

---

## Who it is for

| Role | Goal |
| --- | --- |
| **Teacher** | Prepare a short lesson pack ahead of time, run a live class on one shared stage, pick student questions to explore, publish something for Learning, glance at curiosity analytics. |
| **Student** | Join the live class, watch the teacher’s shared video, ask questions / raise a hand, and later revisit Learning content the teacher made visible. |
| **Studio / Prepare user** | Usually the same teacher before class: generate a short merged lesson video (and optional 3D stills) from a topic. |

Typical demo setup: teacher on one screen, student(s) on another browser or phone, same classroom session.

---

## What CURIO is trying to solve

Classic classroom video is one-way. Live Q&A is often chat noise without a shared visual payoff.

CURIO bets on three ideas:

1. **One shared stage** — everyone sees the same lesson moment (especially the video the teacher puts on Live class).
2. **Teacher as conductor** — students ask freely; only the teacher decides what the class explores next.
3. **Prepare once, teach live, leave Learning behind** — generation happens before class; live class stays snappy; Learning is the student-facing shelf for published packs.

---

## Product surfaces (where people go)

From the home lobby, three doors:

| Door | Route feel | Purpose |
| --- | --- | --- |
| **Teacher — Lead the lesson** | Teacher desk | Dashboard stage, Prepare, Analytics, Settings; Class Chat on the right. |
| **Student — Ask into the world** | Student desk | Live class + Learning in the left sidebar; ask / my questions on the right during Live. |
| **Studio — Prepare assets** | Standalone Prepare | Same prepare flow as the teacher’s Prepare tab (useful for building packs before opening the desk). |

Everyone lands in one shared “classroom room” conceptually: actions on the teacher side show up for students (live video, notices, clips, language, exploration moments).

---

## Content & modes (mental model)

Think of three layers of “video / lesson presence”:

### 1. Prepared pack (before class)

Teacher enters:

- Topic (e.g. “How a volcano erupts”)
- Age group
- Language (English / Hindi / Spanish)
- Keywords
- Optional generation toggles (plan beats, generate HD video from stills, 3D from stills)

Output the product cares about most for class:

- A **short merged lesson video** (~16s in the current prototype)
- Optionally separate clips, stills, 3D assets (more visible in full Prepare / Studio)

### 2. Live class (during class)

- Teacher **Uploads** a prepared merged video onto the Dashboard stage.
- That upload is what students see under **Live class**.
- Live class is also where questions, hands, explore, AI clips, captions, and language switches happen.

### 3. Learning (after / beside live)

- Teacher clicks **Share for Learning** on a prepared pack.
- Students open the **Learning** tab and watch that published video on their own (self-paced feel).
- Learning is intentionally separate from Live: not the same as “whatever is on stage right now,” but “what the teacher chose to unlock for students.”

---

## Teacher experience

### Left sidebar

1. **Dashboard** — main live stage + toolbar  
2. **Prepare** — generate / review pack + Share for Learning  
3. **Analytics** — curiosity / video engagement digest  
4. **Settings** — media / language / service-oriented controls for the demo  

### Dashboard (Live stage)

Empty until the teacher uploads a pack.

Once uploaded:

- Class sees the prepared lesson video on the stage.
- Overlay can show **AI clips** when the teacher reveals them.
- Bottom **toolbar** supports:
  - Pause / Resume (and Explore / Next beat / Return when deep in a question journey)
  - Captions
  - **Upload** (pick prepared merged lesson)
  - Participants popover (who joined)
  - Class language: `en` / `hi` / `es`

### Class Chat (right rail, Dashboard only)

Permanent chat-style rail for the live lesson:

- Incoming student questions with status (new / selected / exploring / answered-ish)
- Teacher can select a question, **Explore** it with the class
- Optional checkboxes to batch questions toward **AI clips**, then show/hide those clips to the class
- Collapsible body; the rail stays as the teacher’s always-on curiosity inbox

### Prepare tab

Simplified teacher-facing form:

- Fill topic / age / language / keywords  
- Toggle generation options  
- Generate with progress  
- When a lesson video exists → preview + **Share for Learning**

(Full Studio `/prepare` can show richer pipeline / beats / asset grid; embedded teacher Prepare stays focused.)

### Analytics tab

Teacher-facing curiosity board, e.g.:

- Questions asked / explored  
- Hands up  
- Engagement around the merged lesson video  
- Narration-language mixes  
- Recent event stream  

Useful for “what did this class actually wonder about?” ideation, not just vanity metrics.

---

## Student experience

### Left sidebar (only two tabs)

1. **Live class** — the video the teacher currently shared to the live stage  
2. **Learning** — the video the teacher published via Share for Learning  

No Prepare / Analytics / Settings for students.

### Live class

- Name field + captions toggle in the desk bar  
- Center stage: blank copy until teacher shares; then the same live lesson video  
- May also show class AI clips when the teacher reveals them  
- Toolbar-ish actions: Raise hand, Ask question, My questions  
- Right rail: ask composer or list of “my questions” with status badges  

Students do **not** control the shared stage. They contribute curiosity; the teacher conducts.

### Learning

- Self-paced player for the published pack  
- Empty state until the teacher shares something for Learning  
- No Class Chat rail required here — it’s review / homework-adjacent, not live Q&A  

---

## End-to-end user flows

### Flow A — Before class: prepare a lesson

```
Lobby → Studio (or Teacher → Prepare)
  → Enter topic, age, language, keywords
  → Generate lesson pack
  → Wait for progress / merged video
  → (Optional) Share for Learning early
  → Ready for live Upload later
```

**Success looks like:** a short lesson video exists that the teacher can put on stage and/or unlock under Learning.

---

### Flow B — Start live class with video

```
Teacher opens Dashboard
  → Upload → choose prepared merged lesson
  → Video appears on teacher stage
Student opens Live class
  → Same video appears for the student
```

**Success looks like:** one shared visual lesson, teacher-controlled.

---

### Flow C — Student asks; teacher explores

```
Student (Live class)
  → Types a question → Send to teacher
  → (Optional) Raise hand
Teacher (Class Chat)
  → Sees question
  → Selects / Explore
  → Class enters a shared “explore” journey (beats / transformation moments)
  → Teacher advances beats, pauses, or Returns to the main lesson
Student
  → Sees status badges (New → Selected → Exploring → Answered-ish)
  → Stage copy / shared moment updates with the class
```

**Success looks like:** curiosity is visible, teacher chooses the path, the whole class stays together.

---

### Flow D — Teacher turns many questions into AI clips

```
Teacher checks several Class Chat questions
  → Plans / generates AI clip cards for the batch
  → Show to class
Student Live class
  → Sees clip cards on the stage area
Teacher
  → Hide when done
```

**Success looks like:** many similar questions get a collective answer moment without exploring each one fully.

---

### Flow E — Publish for Learning

```
Teacher → Prepare
  → Share for Learning on a ready pack
Student → Learning
  → Watches the published lesson video later or in parallel
```

**Success looks like:** live remains “now”; Learning remains “what I can revisit.”

---

### Flow F — Language for the whole class

```
Teacher toolbar language → en / hi / es
  → Captions / narration orientation shift for the shared lesson
Students
  → Experience the class in the teacher-chosen language context
```

---

### Flow G — After / during class: analytics glance

```
Teacher → Analytics
  → Review what was asked, explored, watched, in which language
  → Use that to plan the next Prepare topic or Learning share
```

---

## Core interaction loops (compact)

### Live curiosity loop

`Student asks → Teacher selects → Class explores → Return to lesson`

This is the heart of CURIO’s live identity.

### Prepare → present loop

`Generate pack → Upload to Live → (optional) Share to Learning`

This is the content pipeline identity.

### Presence loop

`Student joins with a name → Appears in participants → Can raise hand / ask → Leaves when gone`

This is the classroom social layer.

---

## Design principles visible in the product

1. **Teacher agency** — students propose; teacher dispatches.  
2. **Shared stage first** — Live class is one composition, not a student-controlled playlist.  
3. **Prepare offline of the live second** — heavy generation is a studio/prepare job, not a mid-lesson wait.  
4. **Live ≠ Learning** — live share vs published learning are explicit teacher actions.  
5. **Multilingual classroom** — language is a class-level lever, not only a personal setting.  
6. **Curiosity as data** — questions, hands, explores, and video plays feed a teacher analytics story.  
7. **Calm student chrome** — students get Live + Learning only; ask/hand tools sit beside Live.

---

## Current prototype character (for ideation context)

- Visual theme: warm classroom / PetFoster-like cream–violet–pink teacher desk UI.  
- Demo lesson DNA historically centered on science “world” moments (mountains / rock / volcano-style explainers); Prepare now generalizes to arbitrary topics.  
- Live explore can still feel like a **shared transformation journey** (beats the class walks through), even when the main stage is a prepared video.  
- AI clips are a lighter, card-based class answer path than a full explore.  
- Short merged videos (~16s) keep the “upload something finished” path demo-friendly.

Treat timings, seed participants, and exact generation backends as prototype details — the product story above is the durable shape.

---

## Opportunity spaces (useful for further research / ideation)

These are intentional white space, not bugs:

1. **Richer Learning paths** — playlists, checkpoints, “replay the question we explored,” personal notes.  
2. **Student agency without breaking teacher lead** — private wonder journal, optional side quests after class.  
3. **Question clustering UX** — better than checkboxes for “these five asks are the same idea.”  
4. **Prepare templates** — curriculum-aligned packs by age/subject.  
5. **Live pacing aids** — timers, “pause for talk,” cold-call from hands list.  
6. **Accessibility** — captions quality, language fallbacks, low-bandwidth modes.  
7. **Parent / school views** — anonymized curiosity digests.  
8. **Assessment light** — exit tickets tied to what was actually explored.  
9. **Multi-section classrooms** — same pack, different live rooms.  
10. **Authoring collaboration** — school media team prepares; teacher only uploads + conducts.

---

## Quick glossary

| Term | Meaning in CURIO |
| --- | --- |
| **Lobby** | Home with Teacher / Student / Studio doors. |
| **Dashboard** | Teacher’s live stage. |
| **Prepare / Studio** | Build the lesson pack before or beside class. |
| **Upload** | Put a prepared merged video on the live stage (students’ Live class). |
| **Share for Learning** | Publish a pack to students’ Learning tab. |
| **Class Chat** | Teacher inbox of student questions. |
| **Explore** | Teacher-led shared journey into a selected question. |
| **AI clips** | Batch answer cards shown to the whole class. |
| **Hand** | Student signal for attention without a full question. |
| **Learning** | Student self-paced published lesson video. |
| **Live class** | Student view of the teacher’s current shared stage video. |

---

## Suggested reading order for another LLM / researcher

1. This file — product story & flows  
2. Lobby copy + the three doors (entry framing)  
3. Teacher Dashboard → Upload → Class Chat → Explore  
4. Student Live class ↔ Learning split  
5. Prepare “Share for Learning” vs Dashboard “Upload” distinction  
6. Analytics as the curiosity feedback loop  
7. Opportunity spaces above for new concepts

If researching **new product ideas**, prefer starting from the loops (curiosity / prepare→present / presence) rather than from implementation folders.
