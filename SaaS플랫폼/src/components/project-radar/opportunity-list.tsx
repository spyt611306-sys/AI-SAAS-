"use client";

import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Database,
  Loader2,
  MapPin,
  Search
} from "lucide-react";
import {
  categoryLabel,
  categoryOptions,
  recordKindLabel,
  savedStatusLabel,
  workTypeOptions
} from "@/components/project-radar/constants";
import { PriorityTabs } from "@/components/project-radar/priority-tabs";
import { Meta, QualityBadge, ScoreGauge } from "@/components/project-radar/shared";
import { DeadlineFilter, getPrimaryDateLabel, getReadableSummary, getRecordKind, PriorityView, ViewMode } from "@/components/project-radar/utils";
import { getSourceBadgeLabel } from "@/lib/evidence";
import { evaluateOpportunityQuality } from "@/lib/opportunity-quality";
import {
  MatchResult,
  Opportunity,
  OpportunityRecordKind,
  OpportunityStatus,
  SavedOpportunity,
  SourceCategory
} from "@/lib/types";

type RecordKindFilter = "all" | OpportunityRecordKind;
type SavedStatusFilter = "all" | OpportunityStatus;

export interface OpportunityListFilters {
  query: string;
  category: "all" | SourceCategory;
  recordKindFilter: RecordKindFilter;
  workTypeFilter: string;
  savedStatusFilter: SavedStatusFilter;
  deadlineFilter: DeadlineFilter;
  minAmountFilter: string;
  maxAmountFilter: string;
  viewMode: ViewMode;
}

export function OpportunityList({
  opportunities,
  matchById,
  savedById,
  selectedId,
  filters,
  priorityCounts,
  isLoading,
  onFiltersChange,
  onSelect,
  onToggleSaved
}: {
  opportunities: Opportunity[];
  matchById: Map<string, MatchResult>;
  savedById: Map<string, SavedOpportunity>;
  selectedId?: string;
  filters: OpportunityListFilters;
  priorityCounts: Record<PriorityView, number>;
  isLoading: boolean;
  onFiltersChange: (filters: Partial<OpportunityListFilters>) => void;
  onSelect: (id: string) => void;
  onToggleSaved: (opportunity: Opportunity) => void;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-white shadow-soft">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#43505b]">
            <Database className="h-4 w-4 text-[#1f6f5b]" />
            Opportunities
          </div>
          <p className="mt-1 text-2xl font-semibold">{opportunities.length.toLocaleString("ko-KR")}건</p>
        </div>

        <PriorityTabs
          value={filters.viewMode}
          counts={priorityCounts}
          onChange={(viewMode) => onFiltersChange({ viewMode })}
        />

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_140px_130px_130px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8894]" />
            <input
              value={filters.query}
              onChange={(event) => onFiltersChange({ query: event.target.value })}
              placeholder="품목, 기관, 지역, 키워드 검색"
              className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
            />
          </div>
          <select
            value={filters.category}
            onChange={(event) => onFiltersChange({ category: event.target.value as "all" | SourceCategory })}
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          >
            <option value="all">전체 분야</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {categoryLabel[option]}
              </option>
            ))}
          </select>
          <select
            value={filters.recordKindFilter}
            onChange={(event) => onFiltersChange({ recordKindFilter: event.target.value as RecordKindFilter })}
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          >
            <option value="all">전체 자료</option>
            <option value="bid">입찰공고</option>
            <option value="award">낙찰결과</option>
          </select>
          <select
            value={filters.workTypeFilter}
            onChange={(event) => onFiltersChange({ workTypeFilter: event.target.value })}
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          >
            <option value="all">전체 업무</option>
            {workTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[140px_130px_130px_130px]">
          <select
            value={filters.deadlineFilter}
            onChange={(event) => onFiltersChange({ deadlineFilter: event.target.value as DeadlineFilter })}
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          >
            <option value="all">전체 일정</option>
            <option value="7">마감 7일</option>
            <option value="30">마감 30일</option>
            <option value="expired">마감 지남</option>
          </select>
          <input
            type="number"
            value={filters.minAmountFilter}
            onChange={(event) => onFiltersChange({ minAmountFilter: event.target.value })}
            placeholder="최소 금액"
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          />
          <input
            type="number"
            value={filters.maxAmountFilter}
            onChange={(event) => onFiltersChange({ maxAmountFilter: event.target.value })}
            placeholder="최대 금액"
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          />
          <select
            value={filters.savedStatusFilter}
            onChange={(event) => onFiltersChange({ savedStatusFilter: event.target.value as SavedStatusFilter })}
            className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          >
            <option value="all">전체 상태</option>
            {Object.entries(savedStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-[calc(100vh-210px)] overflow-auto p-3 scrollbar-thin">
        {isLoading ? (
          <div className="grid h-80 place-items-center text-sm text-[#697783]">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-[#1f6f5b]" />
            데이터 로딩 중
          </div>
        ) : (
          <div className="space-y-2">
            {opportunities.map((opportunity) => (
              <OpportunityRow
                key={opportunity.id}
                opportunity={opportunity}
                match={matchById.get(opportunity.id)}
                saved={savedById.get(opportunity.id)}
                isSelected={selectedId === opportunity.id}
                onSelect={onSelect}
                onToggleSaved={onToggleSaved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OpportunityRow({
  opportunity,
  match,
  saved,
  isSelected,
  onSelect,
  onToggleSaved
}: {
  opportunity: Opportunity;
  match?: MatchResult;
  saved?: SavedOpportunity;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleSaved: (opportunity: Opportunity) => void;
}) {
  const quality = evaluateOpportunityQuality(opportunity);

  return (
    <article
      className={`grid gap-3 rounded-lg border p-4 transition ${
        isSelected ? "border-[#1f6f5b] bg-[#f5fbf8]" : "border-[#e7ecf1] bg-white hover:border-[#b8c2cc]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onSelect(opportunity.id)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                getRecordKind(opportunity) === "bid" ? "bg-[#e6f2ee] text-[#1f6f5b]" : "bg-[#eef2f5] text-[#43505b]"
              }`}
            >
              {recordKindLabel[getRecordKind(opportunity)]}
            </span>
            <span className="rounded-md bg-[#e6f2ee] px-2 py-1 text-xs font-semibold text-[#1f6f5b]">
              {categoryLabel[opportunity.category]}
            </span>
            <span className="rounded-md bg-[#f3eadf] px-2 py-1 text-xs font-semibold text-[#80531c]">
              {getSourceBadgeLabel(opportunity.sourceUrl)}
            </span>
            <QualityBadge quality={quality} />
            {opportunity.riskFlags.length ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#fae8e8] px-2 py-1 text-xs font-semibold text-[#9a4242]">
                <AlertTriangle className="h-3 w-3" />
                주의
              </span>
            ) : null}
            {saved ? (
              <span className="rounded-md bg-[#f7edf0] px-2 py-1 text-xs font-semibold text-[#8f3d46]">
                {savedStatusLabel[saved.status]}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold leading-snug">{opportunity.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5d6a75]">{getReadableSummary(opportunity)}</p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <ScoreGauge score={match?.score || 0} label="매칭" />
          <button
            type="button"
            onClick={() => onToggleSaved(opportunity)}
            className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-[#5d6a75] hover:text-[#8f3d46]"
            aria-label={saved ? "저장 해제" : "관심 저장"}
          >
            {saved ? <BookmarkCheck className="h-4 w-4 text-[#8f3d46]" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-[#5d6a75] md:grid-cols-4">
        <Meta icon={Building2} label={opportunity.buyer} />
        <Meta icon={MapPin} label={opportunity.region} />
        <Meta icon={CircleDollarSign} label={opportunity.amountLabel} />
        <Meta icon={CalendarDays} label={getPrimaryDateLabel(opportunity)} />
      </div>
    </article>
  );
}
