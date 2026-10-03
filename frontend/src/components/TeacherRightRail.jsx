import { QuestionPanel } from "./QuestionPanel.jsx";

export function TeacherRightRail({ state, act, exploreId }) {
  return (
    <aside
      className="z-20 flex h-full min-h-0 w-[340px] shrink-0 flex-col overflow-hidden rounded-l-[40px] border-l-4 border-[rgba(236,72,153,0.25)] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.04)] max-[980px]:hidden"
      aria-label="Class chat"
    >
      <QuestionPanel state={state} act={act} exploreId={exploreId} />
    </aside>
  );
}
