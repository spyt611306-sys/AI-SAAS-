"use client";

import { FileSearch, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CompanyProfilePanel } from "@/components/project-radar/company-profile-panel";
import { MetricGrid } from "@/components/project-radar/metric-grid";
import { OpportunityDetail } from "@/components/project-radar/opportunity-detail";
import { OpportunityList, OpportunityListFilters } from "@/components/project-radar/opportunity-list";
import { ReviewWorkspace, SavedUpdate } from "@/components/project-radar/review-workspace";
import { SourceMonitor } from "@/components/project-radar/source-monitor";
import {
  buildPriorityCounts,
  getRecordKind,
  isAmountInFilter,
  isDeadlineInFilter,
  isPriorityMatch
} from "@/components/project-radar/utils";
import {
  AppState,
  CollectionResult,
  CompanyProfile,
  MatchResult,
  Opportunity,
  SavedOpportunity
} from "@/lib/types";

const emptyProfile: CompanyProfile = {
  name: "",
  targetCategories: [],
  targetBuyers: [],
  targetRegions: [],
  suppliedItems: [],
  excludedKeywords: [],
  certifications: [],
  pastPerformances: [],
  equipment: [],
  personnel: [],
  partnerBuyers: [],
  unavailableConditions: []
};

const emptyState: AppState = {
  sources: [],
  opportunities: [],
  profile: emptyProfile,
  matches: [],
  saved: [],
  collectionResults: []
};

const initialFilters: OpportunityListFilters = {
  query: "",
  category: "all",
  recordKindFilter: "all",
  workTypeFilter: "all",
  savedStatusFilter: "all",
  deadlineFilter: "all",
  minAmountFilter: "",
  maxAmountFilter: "",
  viewMode: "recommended"
};

export default function ProjectRadarApp() {
  const [state, setState] = useState<AppState>(emptyState);
  const [selectedId, setSelectedId] = useState<string>("");
  const [filters, setFilters] = useState<OpportunityListFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<CompanyProfile>(emptyProfile);

  useEffect(() => {
    void loadState();
  }, []);

  useEffect(() => {
    if (state.profile.name) {
      setProfileDraft(state.profile);
    }
  }, [state.profile]);

  const matchById = useMemo(() => {
    return new Map(state.matches.map((match) => [match.opportunityId, match]));
  }, [state.matches]);

  const savedById = useMemo(() => {
    return new Map(state.saved.map((saved) => [saved.opportunityId, saved]));
  }, [state.saved]);

  const filteredOpportunities = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return state.opportunities
      .filter((opportunity) => {
        const kind = getRecordKind(opportunity);
        if (!isPriorityMatch(opportunity, filters.viewMode, matchById.get(opportunity.id), state.profile)) return false;
        if (filters.category !== "all" && opportunity.category !== filters.category) return false;
        if (filters.recordKindFilter !== "all" && kind !== filters.recordKindFilter) return false;
        if (filters.workTypeFilter !== "all" && !opportunity.workType.includes(filters.workTypeFilter)) return false;
        if (filters.savedStatusFilter !== "all" && savedById.get(opportunity.id)?.status !== filters.savedStatusFilter) return false;
        if (!isAmountInFilter(opportunity.amount, filters.minAmountFilter, filters.maxAmountFilter)) return false;
        if (!isDeadlineInFilter(opportunity.deadline, filters.deadlineFilter)) return false;
        if (!normalizedQuery) return true;
        return [
          opportunity.title,
          opportunity.buyer,
          opportunity.notice?.noticeAgency,
          opportunity.notice?.demandAgency,
          opportunity.region,
          opportunity.workType,
          opportunity.keywords.join(" "),
          opportunity.requiredItems.join(" ")
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (filters.viewMode === "market") {
          return (right.award?.awardAmount || right.amount || 0) - (left.award?.awardAmount || left.amount || 0);
        }
        return (matchById.get(right.id)?.score || 0) - (matchById.get(left.id)?.score || 0);
      });
  }, [filters, matchById, savedById, state.opportunities, state.profile]);

  const selectedOpportunity = useMemo(() => {
    return (
      filteredOpportunities.find((opportunity) => opportunity.id === selectedId) ||
      filteredOpportunities[0] ||
      state.opportunities[0]
    );
  }, [filteredOpportunities, selectedId, state.opportunities]);

  async function loadState() {
    setIsLoading(true);
    const response = await fetch("/api/state", { cache: "no-store" });
    const nextState = (await response.json()) as AppState;
    setState(nextState);
    setSelectedId((current) => current || nextState.opportunities[0]?.id || "");
    setIsLoading(false);
  }

  async function collectSources() {
    setIsCollecting(true);
    const response = await fetch("/api/collect", { method: "POST" });
    const payload = (await response.json()) as { results: CollectionResult[]; state: AppState };
    setState(payload.state);
    setSelectedId(payload.state.opportunities[0]?.id || "");
    setIsCollecting(false);
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileDraft)
    });
    setState((await response.json()) as AppState);
    setIsSavingProfile(false);
  }

  async function toggleSaved(opportunity: Opportunity) {
    const saved = savedById.get(opportunity.id);
    await updateSaved(opportunity.id, saved ? { remove: true } : { status: "new", note: "" });
  }

  async function updateSaved(opportunityId: string, next: SavedUpdate) {
    const response = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId,
        ...next
      })
    });
    setState((await response.json()) as AppState);
  }

  const stats = buildStats(state.opportunities, state.matches, state.saved);
  const priorityCounts = buildPriorityCounts(state.opportunities, matchById, state.profile);

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-3 py-4 lg:px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-[#1f6f5b] text-white">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">ProjectRadar</h1>
              <p className="text-sm text-[#697783]">공식 데이터 기반 프로젝트 추천 프로토타입</p>
            </div>
          </div>
          <button
            type="button"
            onClick={collectSources}
            disabled={isCollecting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1f6f5b] px-4 text-sm font-semibold text-white transition hover:bg-[#195c4b] disabled:cursor-wait disabled:opacity-70"
          >
            {isCollecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            수동 새로고침
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-3 px-3 py-4 lg:px-4 min-[1400px]:grid-cols-[280px_minmax(600px,1fr)_500px] 2xl:grid-cols-[300px_minmax(680px,1fr)_540px]">
        <aside className="space-y-4">
          <MetricGrid stats={stats} />
          <SourceMonitor sources={state.sources} />
          <CompanyProfilePanel
            profile={profileDraft}
            onChange={setProfileDraft}
            onSave={saveProfile}
            isSaving={isSavingProfile}
          />
          <ReviewWorkspace
            saved={state.saved}
            opportunities={state.opportunities}
            onSelect={setSelectedId}
            onUpdateSaved={updateSaved}
          />
        </aside>

        <OpportunityList
          opportunities={filteredOpportunities}
          matchById={matchById}
          savedById={savedById}
          selectedId={selectedOpportunity?.id}
          filters={filters}
          priorityCounts={priorityCounts}
          isLoading={isLoading}
          onFiltersChange={(nextFilters) => setFilters((current) => ({ ...current, ...nextFilters }))}
          onSelect={setSelectedId}
          onToggleSaved={toggleSaved}
        />

        <OpportunityDetail
          opportunity={selectedOpportunity}
          opportunities={state.opportunities}
          match={selectedOpportunity ? matchById.get(selectedOpportunity.id) : undefined}
          saved={selectedOpportunity ? savedById.get(selectedOpportunity.id) : undefined}
          onToggleSaved={toggleSaved}
          onUpdateSaved={updateSaved}
        />
      </div>
    </main>
  );
}

function buildStats(
  opportunities: Opportunity[],
  matches: MatchResult[],
  saved: SavedOpportunity[]
) {
  void matches;
  return {
    bids: opportunities.filter((opportunity) => getRecordKind(opportunity) === "bid").length,
    awards: opportunities.filter((opportunity) => getRecordKind(opportunity) === "award").length,
    urgentBids: opportunities.filter(
      (opportunity) => getRecordKind(opportunity) === "bid" && isDeadlineInFilter(opportunity.deadline, "7")
    ).length,
    saved: saved.length
  };
}
