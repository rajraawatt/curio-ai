import { QuestionPanel } from "./QuestionPanel.jsx";

export function TeacherRightRail({ state, act, exploreId }) {
  return (
    <aside className="g-right-rail" aria-label="Class chat">
      <QuestionPanel state={state} act={act} exploreId={exploreId} />
    </aside>
  );
}
