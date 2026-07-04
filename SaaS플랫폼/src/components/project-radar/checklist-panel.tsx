"use client";

import { CheckSquare } from "lucide-react";
import { SavedUpdate } from "@/components/project-radar/review-workspace";
import { checklistKeys, checklistLabels, normalizeChecklist } from "@/lib/review";
import { Opportunity, SavedOpportunity } from "@/lib/types";

export function ChecklistPanel({
  opportunity,
  saved,
  onUpdateSaved
}: {
  opportunity: Opportunity;
  saved?: SavedOpportunity;
  onUpdateSaved: (opportunityId: string, next: SavedUpdate) => Promise<void>;
}) {
  if (!saved) return null;

  const checklist = normalizeChecklist(saved.checklist);
  const doneCount = checklistKeys.filter((key) => checklist[key]).length;

  return (
    <section className="mt-4 rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-[#1f6f5b]" />
          <h3 className="text-sm font-semibold">문의 준비 체크리스트</h3>
        </div>
        <span className="text-xs font-semibold text-[#697783]">
          {doneCount}/{checklistKeys.length}
        </span>
      </div>
      <div className="grid gap-2">
        {checklistKeys.map((key) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
            <span>{checklistLabels[key]}</span>
            <input
              type="checkbox"
              checked={checklist[key]}
              onChange={(event) =>
                void onUpdateSaved(opportunity.id, {
                  checklist: {
                    [key]: event.target.checked
                  }
                })
              }
              className="h-4 w-4 accent-[#1f6f5b]"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
