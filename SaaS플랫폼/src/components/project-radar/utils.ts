import { evaluateOpportunityQuality } from "@/lib/opportunity-quality";
import { CompanyProfile, MatchResult, Opportunity, OpportunityRecordKind } from "@/lib/types";

export type PriorityView =
  | "recommended"
  | "this-week"
  | "urgent"
  | "high-score"
  | "has-amount"
  | "has-attachment"
  | "exclude-candidates"
  | "market";

export type ViewMode = PriorityView;

export type DeadlineFilter = "all" | "7" | "30" | "expired";

export const priorityViewLabels: Record<PriorityView, string> = {
  recommended: "추천",
  "this-week": "이번 주",
  urgent: "마감 임박",
  "high-score": "고점수",
  "has-amount": "금액 있음",
  "has-attachment": "첨부 있음",
  "exclude-candidates": "제외 후보",
  market: "시장"
};

export const priorityViewOptions: PriorityView[] = [
  "recommended",
  "this-week",
  "urgent",
  "high-score",
  "has-amount",
  "has-attachment",
  "exclude-candidates",
  "market"
];

export function getRecordKind(opportunity: Opportunity): OpportunityRecordKind {
  return opportunity.recordKind || "bid";
}

export function isPriorityMatch(
  opportunity: Opportunity,
  view: PriorityView,
  match?: MatchResult,
  profile?: CompanyProfile
): boolean {
  const kind = getRecordKind(opportunity);
  if (view === "market") return kind === "award";
  if (kind === "award") return false;

  if (view === "recommended") return true;
  if (view === "this-week") return isDeadlineWithin(opportunity.deadline, 7);
  if (view === "urgent") return isDeadlineWithin(opportunity.deadline, 3);
  if (view === "high-score") return (match?.score || 0) >= 80;
  if (view === "has-amount") return Boolean(opportunity.amount);
  if (view === "has-attachment") return hasAttachment(opportunity);
  if (view === "exclude-candidates") return isExcludeCandidate(opportunity, match, profile);

  return true;
}

export function buildPriorityCounts(
  opportunities: Opportunity[],
  matchById: Map<string, MatchResult>,
  profile: CompanyProfile
): Record<PriorityView, number> {
  return priorityViewOptions.reduce(
    (counts, view) => ({
      ...counts,
      [view]: opportunities.filter((opportunity) => isPriorityMatch(opportunity, view, matchById.get(opportunity.id), profile)).length
    }),
    {} as Record<PriorityView, number>
  );
}

export function isExcludeCandidate(opportunity: Opportunity, match?: MatchResult, profile?: CompanyProfile): boolean {
  const quality = evaluateOpportunityQuality(opportunity);
  if (quality.status === "expired" || quality.status === "insufficient") return true;
  if (match?.penalties.some((penalty) => penalty.label === "제외 키워드" || penalty.label === "불가능 조건")) return true;
  if (!profile) return false;
  const scope = [
    opportunity.title,
    opportunity.summary,
    opportunity.keywords.join(" "),
    opportunity.requiredItems.join(" "),
    opportunity.riskFlags.join(" ")
  ]
    .join(" ")
    .toLowerCase();
  return [...profile.excludedKeywords, ...profile.unavailableConditions].some((keyword) => {
    const normalized = keyword.trim().toLowerCase();
    return normalized.length > 0 && scope.includes(normalized);
  });
}

export function hasAttachment(opportunity: Opportunity): boolean {
  return Boolean(opportunity.notice?.attachmentUrls?.length);
}

export function isAmountInFilter(amount: number | undefined, minText: string, maxText: string): boolean {
  const min = parseAmountFilter(minText);
  const max = parseAmountFilter(maxText);
  if (min === undefined && max === undefined) return true;
  if (!amount) return false;
  if (min !== undefined && amount < min) return false;
  if (max !== undefined && amount > max) return false;
  return true;
}

export function parseAmountFilter(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

export function isDeadlineInFilter(deadline: string | undefined, filter: DeadlineFilter): boolean {
  if (filter === "all") return true;
  const days = getDaysUntil(deadline);
  if (days === undefined) return false;
  if (filter === "expired") return days < 0;
  const limit = Number(filter);
  return days >= 0 && days <= limit;
}

export function isDeadlineWithin(deadline: string | undefined, daysLimit: number): boolean {
  const days = getDaysUntil(deadline);
  return days !== undefined && days >= 0 && days <= daysLimit;
}

export function getDaysUntil(deadline?: string): number | undefined {
  if (!deadline) return undefined;
  const target = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(target.getTime())) return undefined;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

export function formatNoticeNumber(notice: Opportunity["notice"]): string {
  if (!notice?.noticeNo) return "미공개";
  return notice.noticeOrder ? `${notice.noticeNo}-${notice.noticeOrder}` : notice.noticeNo;
}

export function formatAmount(value?: number): string {
  if (!value) return "미공개";
  if (value >= 100000000) {
    return `${(value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

export function getPrimaryDateLabel(opportunity: Opportunity): string {
  if (getRecordKind(opportunity) === "award") {
    return opportunity.award?.awardedAt || opportunity.award?.openedAt || "낙찰일 미공개";
  }
  return opportunity.deadline || opportunity.notice?.bidCloseAt || "마감 미공개";
}

export function getReadableSummary(opportunity: Opportunity): string {
  if (!isRawJsonSummary(opportunity.summary)) {
    return opportunity.summary;
  }

  if (getRecordKind(opportunity) === "award") {
    const winner = opportunity.award?.winnerName ? ` 낙찰업체는 ${opportunity.award.winnerName}` : " 낙찰업체는 원문 확인이 필요합니다";
    const amount = opportunity.award?.awardAmount ? `, 낙찰금액은 ${formatAmount(opportunity.award.awardAmount)}` : "";
    const rate = opportunity.award?.awardRate ? `, 낙찰률은 ${opportunity.award.awardRate}%` : "";
    return `${opportunity.buyer}의 "${opportunity.title}" 낙찰결과입니다.${winner}${amount}${rate}.`;
  }

  const itemText = opportunity.requiredItems.length
    ? ` 주요 품목은 ${opportunity.requiredItems.slice(0, 3).join(", ")}입니다.`
    : "";
  const amountText = opportunity.amount ? ` 예상 금액은 ${formatAmount(opportunity.amount)}입니다.` : "";
  const deadlineText = opportunity.deadline ? ` 마감일은 ${opportunity.deadline}입니다.` : "";
  return `${opportunity.buyer}에서 공개한 "${opportunity.title}" 입찰공고입니다.${itemText}${amountText}${deadlineText}`;
}

function isRawJsonSummary(value: string): boolean {
  const trimmed = value.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  return /"[^"]+"\s*:/.test(trimmed.slice(0, 500));
}
