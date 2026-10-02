import { stageAt, textOf } from "../text.js";

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
    <div className="settings">
      <h2>Classroom systems</h2>
      <p>
        The live path is instant: Gemini plans a scene, and the class sees it immediately. Veo and Imagen are for richer media when the project is connected. They never block the teacher.
      </p>
      <dl>
        <div>
          <dt>Planner</dt>
          <dd>
            {engine === "vertex"
              ? "Gemini on Vertex AI"
              : engine === "gemini-api-key"
                ? "Gemini API key"
                : "Scripted scenes, Gemini not configured"}
          </dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>{health?.project || "Not set"}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{health?.model || "gemini-2.5-flash"}</dd>
        </div>
        <div>
          <dt>BigQuery</dt>
          <dd>{health?.bigquery ? state.bigquery.status : "Not configured"}</dd>
        </div>
        <div>
          <dt>Veo</dt>
          <dd>{state.veo?.status || "Idle"}</dd>
        </div>
      </dl>
      <div className="quick">
        <button type="button" className="primary" onClick={diagram}>
          Illustrate this beat with Imagen
        </button>
        <button type="button" onClick={veo}>
          Ask Veo for a lesson clip
        </button>
        <button type="button" onClick={() => act("reset")}>
          Reset class
        </button>
      </div>
    </div>
  );
}
