import { DataQualityCheck, DataQualityReport, Opportunity } from "@/lib/types";

export function evaluateOpportunityQuality(opportunity: Opportunity): DataQualityReport {
  const checks: DataQualityCheck[] = [
    buildCheck("notice", "공고번호", Boolean(opportunity.notice?.noticeNo), "공고번호 기준 중복 제거와 낙찰 연결에 사용됩니다."),
    buildCheck(
      "agency",
      "기관",
      Boolean(opportunity.buyer || opportunity.notice?.noticeAgency || opportunity.notice?.demandAgency),
      "공고기관 또는 수요기관이 있어야 기관 적합성을 판단할 수 있습니다."
    ),
    buildCheck("amount", "금액", Boolean(opportunity.amount), "금액이 있으면 수행 가능 규모 판단이 더 정확해집니다.", "warning"),
    buildCheck(
      "date",
      opportunity.recordKind === "award" ? "낙찰일" : "마감일",
      Boolean(opportunity.recordKind === "award" ? opportunity.award?.awardedAt || opportunity.award?.openedAt : opportunity.deadline),
      "일정 정보가 있어야 검토 우선순위를 정할 수 있습니다."
    ),
    buildCheck("source", "원문", Boolean(opportunity.originalUrl), "원문 링크가 있어야 근거 확인이 가능합니다."),
    buildCheck(
      "attachments",
      "첨부",
      Boolean(opportunity.notice?.attachmentUrls?.length),
      "첨부가 없으면 세부 규격은 원문에서 직접 확인해야 합니다.",
      "warning"
    )
  ];

  const completedFields = checks.filter((check) => check.status === "present").length;
  const totalFields = checks.length;
  const score = Math.round((completedFields / totalFields) * 100);
  const isExpired = opportunity.recordKind === "bid" && isPastDeadline(opportunity.deadline);
  const missingFields = checks
    .filter((check) => check.status !== "present")
    .map((check) => check.label);

  if (isExpired) {
    return {
      status: "expired",
      label: "마감 지남",
      score,
      completedFields,
      totalFields,
      missingFields,
      checks
    };
  }

  if (score >= 84) {
    return {
      status: "ok",
      label: "정상",
      score,
      completedFields,
      totalFields,
      missingFields,
      checks
    };
  }

  if (score >= 60) {
    return {
      status: "needs-review",
      label: "확인 필요",
      score,
      completedFields,
      totalFields,
      missingFields,
      checks
    };
  }

  return {
    status: "insufficient",
    label: "정보 부족",
    score,
    completedFields,
    totalFields,
    missingFields,
    checks
  };
}

function buildCheck(
  key: string,
  label: string,
  exists: boolean,
  detail: string,
  missingStatus: "missing" | "warning" = "missing"
): DataQualityCheck {
  return {
    key,
    label,
    status: exists ? "present" : missingStatus,
    detail
  };
}

function isPastDeadline(deadline?: string): boolean {
  if (!deadline) return false;
  const target = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() < Date.now();
}
