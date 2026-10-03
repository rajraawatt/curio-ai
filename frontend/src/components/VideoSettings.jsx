import { stageAt, textOf } from "../text.js";

const btnBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 font-bold text-[0.9rem] transition active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none";
const btnViolet = `${btnBase} bg-[#7C3AED] text-white shadow-[0_4px_0_rgba(124,58,237,0.35)] hover:bg-[#6D28D9]`;
const btnNeutral = `${btnBase} bg-gray-100 text-gray-600 shadow-[0_4px_0_rgba(0,0,0,0.08)] hover:bg-gray-200 hover:text-gray-900`;

export function VideoSettings({ state, health, act, send }) {
  const stage = stageAt(state);
  const prompt = stage
    ? `Classroom diagram of ${textOf(stage.caption, "en")} for ages 11 to 14, clear and beautiful`
    : "Cinematic classroom diagram of how a mountain forms, clear and beautiful";

  async function diagram() {
    try {
      await send("/api/diagram", { prompt });
    } catch (err) {
      await act("notice", { notice: err.message });
    }
  }

  async function veo() {
    try {
      await send("/api/veo", {
        prompt: "Cinematic aerial of a sunlit mountain range forming, classroom film, no text, 16:9",
      });
    } catch (err) {
      await act("notice", { notice: err.message });
    }
  }

  const engine = health?.engine || state.engine;

  return (
    <div className="overflow-auto rounded-[22px] border-2 border-[#F0EAE0] bg-white p-4 font-[Nunito,sans-serif] text-[#1F2937] shadow-[0_6px_0_rgba(124,58,237,0.05)]">
      <h2 className="m-0 font-black text-[#1F2937]">Classroom systems</h2>
      <p className="mt-2 m-0 leading-snug text-[#6B7280]">
        The live path is instant: Gemini plans a scene, and the class sees it immediately. Veo and Imagen are for richer
        media when the project is connected. They never block the teacher.
      </p>
      <dl className="my-4 grid gap-2.5">
        <div className="grid grid-cols-[140px_1fr] gap-2">
          <dt className="text-[#6B7280]">Planner</dt>
          <dd className="m-0 font-bold">
            {engine === "vertex"
              ? "Gemini on Vertex AI"
              : engine === "gemini-api-key"
                ? "Gemini API key"
                : "Scripted scenes, Gemini not configured"}
          </dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-2">
          <dt className="text-[#6B7280]">Project</dt>
          <dd className="m-0 font-bold">{health?.project || "Not set"}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-2">
          <dt className="text-[#6B7280]">Model</dt>
          <dd className="m-0 font-bold">{health?.model || "gemini-2.5-flash"}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-2">
          <dt className="text-[#6B7280]">BigQuery</dt>
          <dd className="m-0 font-bold">{health?.bigquery ? state.bigquery.status : "Not configured"}</dd>
        </div>
        <div className="grid grid-cols-[140px_1fr] gap-2">
          <dt className="text-[#6B7280]">Veo</dt>
          <dd className="m-0 font-bold">{state.veo?.status || "Idle"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={btnViolet} onClick={diagram}>
          Illustrate this beat with Imagen
        </button>
        <button type="button" className={btnNeutral} onClick={veo}>
          Ask Veo for a lesson clip
        </button>
        <button type="button" className={btnNeutral} onClick={() => act("reset")}>
          Reset class
        </button>
      </div>
    </div>
  );
}
