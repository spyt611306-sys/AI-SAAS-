import { EvidenceItem, Opportunity } from "@/lib/types";

export function buildTrustEvidence(opportunity: Opportunity): EvidenceItem[] {
  const evidence: EvidenceItem[] = [
    {
      label: "공식 출처 신뢰도",
      impact: "positive",
      points: Math.round(opportunity.sourceReliability * 0.35),
      detail: `${opportunity.sourceName} 출처 신뢰도 ${opportunity.sourceReliability}점을 반영했습니다.`
    }
  ];

  if (opportunity.deadline) {
    evidence.push({
      label: "마감일 확인",
      impact: "positive",
      points: 8,
      detail: `입찰/접수 마감일이 ${opportunity.deadline}로 구조화되어 있습니다.`
    });
  }

  if (opportunity.requiredItems.length) {
    evidence.push({
      label: "요구 품목 추출",
      impact: "positive",
      points: 8,
      detail: `요구 품목 후보: ${opportunity.requiredItems.join(", ")}`
    });
  }

  opportunity.riskFlags.forEach((flag) => {
    evidence.push({
      label: "주의 신호",
      impact: "negative",
      points: -5,
      detail: flag
    });
  });

  return evidence;
}

export function getSourceBadgeLabel(sourceUrl: string): string {
  if (sourceUrl.includes("data.go.kr")) return "공공데이터";
  if (sourceUrl.includes("kogas.or.kr")) return "기관 공식";
  if (sourceUrl.includes("ecredible")) return "공개 모집";
  if (sourceUrl.includes("hd-hhi")) return "대기업 공개";
  return "공식/공개";
}
