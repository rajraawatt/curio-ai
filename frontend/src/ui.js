/** Shared Tailwind class recipes for CURIO PetFoster UI. */
export const font = "font-sans";

export const btn =
  "inline-flex items-center justify-center rounded-full border-0 px-4 py-2.5 font-bold text-sm text-muted bg-[#f3f4f6] shadow-[0_4px_0_rgba(0,0,0,0.08)] transition-[transform,box-shadow,background] duration-150 hover:bg-[#e5e7eb] hover:text-ink active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:translate-y-0";

export const btnOn = "bg-violet-soft text-violet";

export const btnViolet =
  "inline-flex items-center justify-center rounded-full border-0 px-4 py-2.5 font-bold text-sm bg-violet text-white shadow-[0_4px_0_rgba(124,58,237,0.35)] transition-[transform,box-shadow,background] duration-150 hover:bg-violet-deep active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed";

export const btnPink =
  "inline-flex items-center justify-center rounded-full border-0 px-4 py-2.5 font-bold text-sm bg-pink text-white shadow-[0_4px_0_rgba(236,72,153,0.35)] transition-[transform,box-shadow,background] duration-150 hover:brightness-95 active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed";

export const btnYellow =
  "inline-flex items-center justify-center rounded-full border-0 px-4 py-2.5 font-bold text-sm bg-lilac text-ink shadow-[0_4px_0_rgba(196,181,253,0.45)] transition-[transform,box-shadow,background] duration-150 hover:brightness-95 active:translate-y-[3px] active:shadow-none";

export const field =
  "w-full rounded-[14px] border-2 border-line bg-cream px-3.5 py-2.5 font-bold text-ink outline-none focus:border-lilac focus:bg-white";

export const panel =
  "rounded-[22px] border-2 border-line bg-white p-4 shadow-[0_6px_0_rgba(124,58,237,0.05)]";

export const noScrollbar = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}
