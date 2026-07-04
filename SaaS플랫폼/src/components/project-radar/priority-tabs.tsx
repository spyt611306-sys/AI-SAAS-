"use client";

import { priorityViewLabels, priorityViewOptions, PriorityView } from "@/components/project-radar/utils";

export function PriorityTabs({
  value,
  counts,
  onChange
}: {
  value: PriorityView;
  counts: Record<PriorityView, number>;
  onChange: (value: PriorityView) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
      {priorityViewOptions.map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          className={`flex h-10 items-center justify-between gap-2 rounded-md border px-3 text-sm font-semibold transition ${
            value === view
              ? "border-[#1f6f5b] bg-[#e6f2ee] text-[#1f6f5b]"
              : "border-line bg-white text-[#5d6a75] hover:border-[#b8c2cc]"
          }`}
        >
          <span className="truncate">{priorityViewLabels[view]}</span>
          <span className="rounded bg-white/70 px-1.5 py-0.5 text-[11px] tabular-nums">
            {counts[view]?.toLocaleString("ko-KR") || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
