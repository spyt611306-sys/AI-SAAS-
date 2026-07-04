"use client";

import { BookmarkCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { recordKindLabel, savedStatusLabel } from "@/components/project-radar/constants";
import { ExportActions } from "@/components/project-radar/export-actions";
import { EmptyPanel } from "@/components/project-radar/shared";
import { getRecordKind } from "@/components/project-radar/utils";
import { buildSavedStatusCounts, savedStatusOptions } from "@/lib/review";
import { Opportunity, OpportunityStatus, ReviewChecklist, SavedOpportunity } from "@/lib/types";

export interface SavedUpdate {
  status?: OpportunityStatus;
  note?: string;
  nextActionDate?: string;
  ownerNote?: string;
  excludeReason?: string;
  checklist?: Partial<ReviewChecklist>;
  remove?: boolean;
}

export function ReviewWorkspace({
  saved,
  opportunities,
  onSelect,
  onUpdateSaved
}: {
  saved: SavedOpportunity[];
  opportunities: Opportunity[];
  onSelect: (id: string) => void;
  onUpdateSaved: (opportunityId: string, next: SavedUpdate) => Promise<void>;
}) {
  const byId = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const counts = useMemo(() => buildSavedStatusCounts(saved), [saved]);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Review Workspace</h2>
        <div className="flex items-center gap-2">
          <ExportActions />
          <BookmarkCheck className="h-4 w-4 text-[#8f3d46]" />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        {savedStatusOptions.map((status) => (
          <div key={status} className="rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-2">
            <div className="truncate text-[11px] font-semibold text-[#697783]">{savedStatusLabel[status]}</div>
            <div className="mt-1 text-lg font-semibold">{counts[status]}</div>
          </div>
        ))}
      </div>

      {saved.length === 0 ? (
        <EmptyPanel>저장된 프로젝트 없음</EmptyPanel>
      ) : (
        <div className="max-h-[520px] space-y-2 overflow-auto pr-1 scrollbar-thin">
          {saved.map((item) => {
            const opportunity = byId.get(item.opportunityId);
            return (
              <ReviewRow
                key={item.opportunityId}
                item={item}
                title={opportunity?.title || item.opportunityId}
                recordKind={opportunity ? getRecordKind(opportunity) : "bid"}
                onSelect={onSelect}
                onUpdateSaved={onUpdateSaved}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewRow({
  item,
  title,
  recordKind,
  onSelect,
  onUpdateSaved
}: {
  item: SavedOpportunity;
  title: string;
  recordKind: Opportunity["recordKind"];
  onSelect: (id: string) => void;
  onUpdateSaved: (opportunityId: string, next: SavedUpdate) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    note: item.note || "",
    nextActionDate: item.nextActionDate || "",
    ownerNote: item.ownerNote || "",
    excludeReason: item.excludeReason || ""
  });

  useEffect(() => {
    setDraft({
      note: item.note || "",
      nextActionDate: item.nextActionDate || "",
      ownerNote: item.ownerNote || "",
      excludeReason: item.excludeReason || ""
    });
  }, [item.note, item.nextActionDate, item.ownerNote, item.excludeReason, item.opportunityId]);

  function saveDraft(nextStatus = item.status) {
    void onUpdateSaved(item.opportunityId, {
      status: nextStatus,
      note: draft.note,
      nextActionDate: draft.nextActionDate,
      ownerNote: draft.ownerNote,
      excludeReason: draft.excludeReason
    });
  }

  return (
    <div className="rounded-md border border-[#e7ecf1] p-3">
      <button type="button" onClick={() => onSelect(item.opportunityId)} className="block w-full text-left hover:text-[#1f6f5b]">
        <div className="line-clamp-2 text-sm font-semibold leading-5">{title}</div>
        <div className="mt-1 text-xs text-[#697783]">{recordKindLabel[recordKind]}</div>
      </button>

      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <select
          value={item.status}
          onChange={(event) => saveDraft(event.target.value as OpportunityStatus)}
          className="h-9 rounded-md border border-line bg-white px-2 text-xs outline-none ring-[#1f6f5b]/20 focus:ring-4"
        >
          {savedStatusOptions.map((status) => (
            <option key={status} value={status}>
              {savedStatusLabel[status]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={draft.nextActionDate}
          onChange={(event) => setDraft((current) => ({ ...current, nextActionDate: event.target.value }))}
          className="h-9 rounded-md border border-line px-2 text-xs outline-none ring-[#1f6f5b]/20 focus:ring-4"
        />
        <button
          type="button"
          onClick={() => void onUpdateSaved(item.opportunityId, { remove: true })}
          className="h-9 rounded-md border border-line px-3 text-xs font-semibold text-[#8f3d46] hover:border-[#8f3d46]"
        >
          해제
        </button>
      </div>

      <textarea
        value={draft.note}
        onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
        placeholder="검토 메모"
        className="mt-2 min-h-14 w-full resize-y rounded-md border border-line px-2 py-2 text-xs leading-5 outline-none ring-[#1f6f5b]/20 focus:ring-4"
      />
      <input
        value={draft.ownerNote}
        onChange={(event) => setDraft((current) => ({ ...current, ownerNote: event.target.value }))}
        placeholder="담당자 메모"
        className="mt-2 h-9 w-full rounded-md border border-line px-2 text-xs outline-none ring-[#1f6f5b]/20 focus:ring-4"
      />
      <input
        value={draft.excludeReason}
        onChange={(event) => setDraft((current) => ({ ...current, excludeReason: event.target.value }))}
        placeholder="제외 사유"
        className="mt-2 h-9 w-full rounded-md border border-line px-2 text-xs outline-none ring-[#1f6f5b]/20 focus:ring-4"
      />
      <button
        type="button"
        onClick={() => saveDraft()}
        className="mt-2 h-9 w-full rounded-md border border-line bg-white px-3 text-xs font-semibold text-[#1f6f5b] hover:border-[#1f6f5b]"
      >
        검토 정보 저장
      </button>
    </div>
  );
}
