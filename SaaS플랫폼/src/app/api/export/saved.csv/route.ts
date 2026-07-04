import { getAppState } from "@/lib/db";
import { evaluateOpportunityQuality } from "@/lib/opportunity-quality";
import { savedStatusLabel } from "@/lib/review";
import { MatchResult, Opportunity, SavedOpportunity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = ["상태", "점수", "품질", "공고명", "발주처", "금액", "마감일", "원문", "메모", "다음 액션일", "제외 사유"];

export async function GET() {
  const state = getAppState();
  const opportunityById = new Map(state.opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const matchById = new Map(state.matches.map((match) => [match.opportunityId, match]));

  const rows = state.saved.map((saved) => {
    const opportunity = opportunityById.get(saved.opportunityId);
    const match = matchById.get(saved.opportunityId);
    return buildRow(saved, opportunity, match);
  });

  const csv = `\uFEFF${[headers, ...rows].map(serializeCsvRow).join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="projectradar-saved.csv"'
    }
  });
}

function buildRow(saved: SavedOpportunity, opportunity?: Opportunity, match?: MatchResult): string[] {
  if (!opportunity) {
    return [
      savedStatusLabel[saved.status],
      "",
      "공고 없음",
      saved.opportunityId,
      "",
      "",
      "",
      "",
      saved.note,
      saved.nextActionDate || "",
      saved.excludeReason || ""
    ];
  }

  const quality = evaluateOpportunityQuality(opportunity);
  return [
    savedStatusLabel[saved.status],
    String(match?.score || 0),
    quality.label,
    opportunity.title,
    opportunity.buyer,
    opportunity.amountLabel,
    opportunity.deadline || opportunity.award?.awardedAt || opportunity.award?.openedAt || "",
    opportunity.originalUrl,
    saved.note,
    saved.nextActionDate || "",
    saved.excludeReason || ""
  ];
}

function serializeCsvRow(row: string[]): string {
  return row.map(escapeCsvCell).join(",");
}

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ");
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
