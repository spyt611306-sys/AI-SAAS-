import { AgencyAwardInsight, LinkedAwardSummary, Opportunity } from "@/lib/types";

export function findLinkedAwards(opportunity: Opportunity, opportunities: Opportunity[]): LinkedAwardSummary[] {
  const noticeNo = opportunity.notice?.noticeNo;
  if (!noticeNo || opportunity.recordKind === "award") return [];

  return opportunities
    .filter((candidate) => candidate.recordKind === "award" && candidate.notice?.noticeNo === noticeNo)
    .map((candidate) => ({
      opportunityId: candidate.id,
      winnerName: candidate.award?.winnerName,
      awardAmount: candidate.award?.awardAmount,
      awardRate: candidate.award?.awardRate,
      openedAt: candidate.award?.openedAt,
      awardedAt: candidate.award?.awardedAt,
      participantCount: candidate.award?.participantCount
    }));
}

export function buildAgencyAwardInsight(opportunity: Opportunity, opportunities: Opportunity[]): AgencyAwardInsight | undefined {
  const agencyName = opportunity.notice?.demandAgency || opportunity.notice?.noticeAgency || opportunity.buyer;
  if (!agencyName) return undefined;

  const awards = opportunities.filter((candidate) => {
    if (candidate.recordKind !== "award") return false;
    const agencyScope = [
      candidate.buyer,
      candidate.notice?.noticeAgency,
      candidate.notice?.demandAgency
    ]
      .filter(Boolean)
      .join(" ");
    return agencyScope.includes(agencyName) || agencyName.includes(candidate.buyer);
  });

  if (!awards.length) return undefined;

  const rates = awards
    .map((award) => parseAwardRate(award.award?.awardRate))
    .filter((value): value is number => typeof value === "number");
  const winnerCounts = new Map<string, number>();
  awards.forEach((award) => {
    if (!award.award?.winnerName) return;
    winnerCounts.set(award.award.winnerName, (winnerCounts.get(award.award.winnerName) || 0) + 1);
  });

  return {
    agencyName,
    averageAwardRate: rates.length ? Number((rates.reduce((sum, value) => sum + value, 0) / rates.length).toFixed(2)) : undefined,
    repeatedWinners: Array.from(winnerCounts.entries())
      .map(([winnerName, count]) => ({ winnerName, count }))
      .filter((item) => item.count >= 2)
      .sort((left, right) => right.count - left.count)
      .slice(0, 5),
    awardCount: awards.length
  };
}

function parseAwardRate(value?: string): number | undefined {
  if (!value) return undefined;
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}
