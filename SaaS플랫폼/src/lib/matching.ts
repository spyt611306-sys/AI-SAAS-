import { evaluateOpportunityQuality } from "@/lib/opportunity-quality";
import { CompanyProfile, EvidenceItem, MatchResult, MatchScoreBreakdown, Opportunity, SourceCategory } from "@/lib/types";

const categoryLabel: Record<SourceCategory, string> = {
  public: "공공/국가",
  "power-gas-facility": "전력·가스·설비",
  "construction-civil": "건설·토목·공사",
  "enterprise-public": "대기업 공개"
};

export function scoreOpportunities(opportunities: Opportunity[], profile: CompanyProfile): MatchResult[] {
  return opportunities.map((opportunity) => scoreOpportunity(opportunity, profile));
}

export function scoreOpportunity(opportunity: Opportunity, profile: CompanyProfile): MatchResult {
  const reasons: EvidenceItem[] = [];
  const penalties: EvidenceItem[] = [];
  const breakdown: MatchScoreBreakdown = {
    item: 0,
    agency: 0,
    amount: 0,
    timeline: 0,
    source: 0,
    quality: 0,
    capability: 0
  };

  if ((opportunity.recordKind || "bid") === "award") {
    return {
      opportunityId: opportunity.id,
      score: 15,
      breakdown: {
        item: 0,
        agency: 0,
        amount: 0,
        timeline: 0,
        source: 0,
        quality: 15,
        capability: 0
      },
      reasons: [
        {
          label: "시장 참고 데이터",
          impact: "neutral",
          points: 15,
          detail: "낙찰결과는 이미 종료된 건이라 신규 참여 추천 대상에서 제외하고, 경쟁사와 가격 참고용으로 표시합니다."
        }
      ],
      penalties: [
        {
          label: "참여 불가",
          impact: "negative",
          points: -40,
          detail: "이 데이터는 입찰공고가 아니라 낙찰 완료 결과입니다."
        }
      ]
    };
  }

  const searchScope = buildSearchScope(opportunity);
  const itemMatches = unique([
    ...findKeywordHits(profile.suppliedItems, searchScope),
    ...intersection(profile.suppliedItems, opportunity.requiredItems)
  ]);
  if (itemMatches.length) {
    breakdown.item = Math.min(40, 18 + itemMatches.length * 8);
    reasons.push({
      label: "품목 적합성",
      impact: "positive",
      points: breakdown.item,
      detail: `취급 품목과 공고 요구 내용이 맞습니다: ${itemMatches.slice(0, 5).join(", ")}`
    });
  } else {
    breakdown.item = -10;
    penalties.push({
      label: "품목 적합성",
      impact: "negative",
      points: breakdown.item,
      detail: "취급 품목과 직접 일치하는 단어가 아직 없습니다."
    });
  }

  if (profile.targetCategories.includes(opportunity.category)) {
    breakdown.agency += 16;
    reasons.push({
      label: "분야 적합성",
      impact: "positive",
      points: 16,
      detail: `관심 분야인 ${categoryLabel[opportunity.category]} 공고입니다.`
    });
  }

  const buyerScope = [
    opportunity.buyer,
    opportunity.notice?.noticeAgency,
    opportunity.notice?.demandAgency
  ]
    .filter(Boolean)
    .join(" ");
  const buyerMatch = profile.targetBuyers.some((buyer) => includesEither(buyerScope, buyer));
  if (buyerMatch) {
    breakdown.agency += 12;
    reasons.push({
      label: "기관 적합성",
      impact: "positive",
      points: 12,
      detail: `${opportunity.buyer}은 회사가 지정한 타깃 기관과 가깝습니다.`
    });
  }

  if (isAmountFit(opportunity.amount, profile.minAmount, profile.maxAmount)) {
    breakdown.amount = opportunity.amount ? 15 : 7;
    reasons.push({
      label: "금액 적합성",
      impact: "positive",
      points: breakdown.amount,
      detail: opportunity.amount
        ? `${opportunity.amountLabel} 규모가 설정한 수행 가능 범위에 들어옵니다.`
        : "금액은 미공개지만 범위 밖으로 판단할 근거는 없습니다."
    });
  } else {
    breakdown.amount = -8;
    penalties.push({
      label: "금액 적합성",
      impact: "negative",
      points: breakdown.amount,
      detail: "금액이 설정한 수행 가능 범위를 벗어납니다."
    });
  }

  const regionMatch = profile.targetRegions.some((region) => includesEither(opportunity.region, region) || region === "전국");
  if (regionMatch) {
    breakdown.agency += 5;
    reasons.push({
      label: "지역 적합성",
      impact: "positive",
      points: 5,
      detail: `${opportunity.region}은 회사의 대응 가능 지역과 겹칩니다.`
    });
  }

  applyCapabilityScore(opportunity, profile, searchScope, breakdown, reasons, penalties);

  const deadlineSignal = getDeadlineSignal(opportunity.deadline);
  if (deadlineSignal) {
    breakdown.timeline = deadlineSignal.points;
    if (deadlineSignal.points > 0) {
      reasons.push(deadlineSignal);
    } else {
      penalties.push(deadlineSignal);
    }
  }

  if (opportunity.sourceReliability >= 90) {
    breakdown.source = 10;
    reasons.push({
      label: "출처 신뢰도",
      impact: "positive",
      points: 10,
      detail: "정부/공공기관 또는 기관 공식 공개 출처라 출처 신뢰도가 높습니다."
    });
  }

  const quality = evaluateOpportunityQuality(opportunity);
  if (quality.status === "ok") {
    breakdown.quality = 5;
    reasons.push({
      label: "데이터 품질",
      impact: "positive",
      points: 5,
      detail: `필수 필드 ${quality.completedFields}/${quality.totalFields}개가 확인됐습니다.`
    });
  } else if (quality.status === "needs-review") {
    breakdown.quality = 1;
    reasons.push({
      label: "데이터 품질",
      impact: "neutral",
      points: 1,
      detail: `확인 필요: ${quality.missingFields.slice(0, 2).join(", ") || "일부 필드"}`
    });
  } else {
    breakdown.quality = quality.status === "expired" ? -15 : -8;
    penalties.push({
      label: "데이터 품질",
      impact: "negative",
      points: breakdown.quality,
      detail: quality.status === "expired" ? "마감이 지난 공고입니다." : `정보 부족: ${quality.missingFields.slice(0, 2).join(", ")}`
    });
  }

  const excludedMatch = findKeywordHits(profile.excludedKeywords, searchScope)[0];
  if (excludedMatch) {
    breakdown.capability -= 30;
    penalties.push({
      label: "제외 키워드",
      impact: "negative",
      points: -30,
      detail: `제외 조건 "${excludedMatch}"에 걸렸습니다.`
    });
  }

  const positive = reasons.reduce((sum, item) => sum + item.points, 0);
  const negative = penalties.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(100, positive + negative));

  return {
    opportunityId: opportunity.id,
    score,
    breakdown,
    reasons,
    penalties
  };
}

function applyCapabilityScore(
  opportunity: Opportunity,
  profile: CompanyProfile,
  searchScope: string,
  breakdown: MatchScoreBreakdown,
  reasons: EvidenceItem[],
  penalties: EvidenceItem[]
): void {
  const capabilityGroups = [
    { label: "인증", matches: findKeywordHits(profile.certifications, searchScope) },
    { label: "실적", matches: findKeywordHits(profile.pastPerformances, searchScope) },
    { label: "장비", matches: findKeywordHits(profile.equipment, searchScope) },
    { label: "인력/기술", matches: findKeywordHits(profile.personnel, searchScope) },
    { label: "협력사 등록 기관", matches: findKeywordHits(profile.partnerBuyers, `${opportunity.buyer} ${opportunity.notice?.noticeAgency || ""} ${opportunity.notice?.demandAgency || ""}`) }
  ]
    .map((group) => ({ ...group, matches: unique(group.matches) }))
    .filter((group) => group.matches.length);

  if (capabilityGroups.length) {
    const matchedTerms = capabilityGroups.flatMap((group) => group.matches);
    const points = Math.min(18, 6 + matchedTerms.length * 3);
    breakdown.capability += points;
    reasons.push({
      label: "역량 적합성",
      impact: "positive",
      points,
      detail: capabilityGroups
        .map((group) => `${group.label}: ${group.matches.slice(0, 3).join(", ")}`)
        .join(" / ")
    });
  }

  const unavailableMatch = findKeywordHits(profile.unavailableConditions, searchScope)[0];
  if (unavailableMatch) {
    breakdown.capability -= 35;
    penalties.push({
      label: "불가능 조건",
      impact: "negative",
      points: -35,
      detail: `회사 프로필의 불가능 조건 "${unavailableMatch}"에 해당할 수 있습니다.`
    });
  }
}

function buildSearchScope(opportunity: Opportunity): string {
  return [
    opportunity.title,
    opportunity.summary,
    opportunity.buyer,
    opportunity.region,
    opportunity.workType,
    opportunity.keywords.join(" "),
    opportunity.requiredItems.join(" "),
    opportunity.notice?.noticeAgency,
    opportunity.notice?.demandAgency,
    opportunity.notice?.productClassName,
    opportunity.notice?.industryName,
    opportunity.riskFlags.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function findKeywordHits(keywords: string[] = [], scope: string): string[] {
  const normalizedScope = scope.toLowerCase();
  return keywords.filter((keyword) => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return normalizedKeyword.length > 0 && normalizedScope.includes(normalizedKeyword);
  });
}

function intersection(left: string[], right: string[]): string[] {
  const normalizedRight = right.map((item) => item.toLowerCase());
  return left.filter((item) =>
    normalizedRight.some((target) => target.includes(item.toLowerCase()) || item.toLowerCase().includes(target))
  );
}

function includesEither(left: string, right: string): boolean {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function isAmountFit(amount: number | undefined, min?: number, max?: number): boolean {
  if (!amount) return true;
  if (typeof min === "number" && amount < min) return false;
  if (typeof max === "number" && amount > max) return false;
  return true;
}

function getDeadlineSignal(deadline?: string): EvidenceItem | undefined {
  if (!deadline) return undefined;
  const now = new Date();
  const target = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(target.getTime())) return undefined;
  const days = Math.ceil((target.getTime() - now.getTime()) / 86400000);

  if (days < 0) {
    return {
      label: "일정 긴급도",
      impact: "negative",
      points: -20,
      detail: "마감일이 이미 지난 공고입니다."
    };
  }

  if (days <= 7) {
    return {
      label: "일정 긴급도",
      impact: "positive",
      points: 6,
      detail: `마감까지 ${days}일 남아 빠른 검토가 필요합니다.`
    };
  }

  if (days <= 30) {
    return {
      label: "일정 긴급도",
      impact: "positive",
      points: 4,
      detail: `마감까지 ${days}일 남아 검토 여유가 있습니다.`
    };
  }

  return undefined;
}
