import { NoticeDetails, Opportunity, RawOpportunityRecord, SourceCategory } from "@/lib/types";

const categoryKeywords: Array<{ category: SourceCategory; keywords: string[] }> = [
  { category: "power-gas-facility", keywords: ["전력", "전기", "가스", "배관", "변압기", "케이블", "펌프", "감시"] },
  { category: "construction-civil", keywords: ["공사", "토목", "건설", "주택", "철도", "도로", "시설"] },
  { category: "enterprise-public", keywords: ["협력", "파트너", "대기업", "모집", "조선", "구매"] }
];

const itemDictionary = [
  "변압기",
  "케이블",
  "배전반",
  "차단기",
  "펌프",
  "밸브",
  "배관",
  "불꽃감지기",
  "감시 서버",
  "제어반",
  "전기설비",
  "통신",
  "철도",
  "토목",
  "건축"
];

export function normalizeRecord(record: RawOpportunityRecord): Opportunity {
  const recordKind = record.recordKind || "bid";
  const title = cleanText(record.title || "제목 미확인 공고");
  const description = cleanText(record.description || "");
  const readableDescription = isRawJsonText(description) ? "" : description;
  const combined = `${title} ${description} ${(record.keywords || []).join(" ")}`;
  const category = record.category || inferCategory(combined);
  const requiredItems =
    recordKind === "award" ? unique(record.requiredItems || []) : unique([...(record.requiredItems || []), ...extractRequiredItems(combined)]);
  const keywords = unique([...(record.keywords || []), ...extractKeywords(combined)]);
  const deadline = recordKind === "award" ? undefined : normalizeDate(record.deadline);
  const publishedAt = normalizeDate(record.publishedAt);
  const amount = normalizeAmount(record.amount);
  const amountLabel = record.amountLabel || (amount ? formatKrw(amount) : "금액 미공개");
  const originalUrl = record.originalUrl || record.sourceUrl;
  const notice = normalizeNotice(record.notice);
  const award = record.award
    ? {
        ...record.award,
        openedAt: normalizeDate(record.award.openedAt),
        awardedAt: normalizeDate(record.award.awardedAt),
        awardAmount: normalizeAmount(record.award.awardAmount)
      }
    : undefined;
  const finalDeadline = deadline || notice?.bidCloseAt;
  const finalPublishedAt = publishedAt || notice?.publishedAt;
  const id = buildOpportunityId(
    record.sourceId,
    title,
    record.buyer || "",
    notice?.noticeNo
      ? `${recordKind}-${notice.noticeNo}-${notice.noticeOrder || ""}`
      : finalDeadline || finalPublishedAt || award?.winnerName || originalUrl
  );

  return {
    id,
    recordKind,
    sourceId: record.sourceId,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    sourceReliability: record.sourceReliability,
    title,
    buyer: cleanText(record.buyer || inferBuyer(record.sourceName)),
    category,
    workType: cleanText(record.workType || inferWorkType(combined)),
    region: cleanText(record.region || "전국"),
    amount,
    amountLabel,
    deadline: finalDeadline,
    publishedAt: finalPublishedAt,
    originalUrl,
    keywords,
    requiredItems,
    summary: buildSummary(recordKind, title, record.buyer || record.sourceName, requiredItems, readableDescription, award),
    trustScore: calculateTrustScore(record.sourceReliability, originalUrl, finalDeadline, requiredItems.length, recordKind),
    riskFlags:
      recordKind === "award"
        ? unique([...(record.riskFlags || []), "이미 종료된 낙찰결과입니다. 시장/경쟁사 참고 데이터로 활용하세요."])
        : record.riskFlags || [],
    notice,
    award,
    collectedAt: new Date().toISOString()
  };
}

export function normalizeRecords(records: RawOpportunityRecord[]): Opportunity[] {
  const map = new Map<string, Opportunity>();
  records.map(normalizeRecord).forEach((opportunity) => map.set(getDedupeKey(opportunity), opportunity));
  return Array.from(map.values());
}

export function getOpportunityDedupeKey(opportunity: Opportunity): string {
  return getDedupeKey(opportunity);
}

export function sanitizeOpportunityForDisplay(opportunity: Opportunity): Opportunity {
  if (!isRawJsonText(opportunity.summary)) return opportunity;
  return {
    ...opportunity,
    summary: buildStoredOpportunitySummary(opportunity)
  };
}

function getDedupeKey(opportunity: Opportunity): string {
  if (opportunity.notice?.noticeNo) {
    return [
      opportunity.sourceId,
      opportunity.recordKind,
      opportunity.notice.noticeNo,
      opportunity.notice.noticeOrder || ""
    ].join(":");
  }
  return opportunity.id;
}

function normalizeNotice(notice?: NoticeDetails): NoticeDetails | undefined {
  if (!notice) return undefined;
  return {
    ...notice,
    estimatedPrice: normalizeAmount(notice.estimatedPrice),
    budgetAmount: normalizeAmount(notice.budgetAmount),
    bidStartAt: normalizeDate(notice.bidStartAt),
    bidCloseAt: normalizeDate(notice.bidCloseAt),
    openAt: normalizeDate(notice.openAt),
    publishedAt: normalizeDate(notice.publishedAt),
    attachmentUrls: Array.from(new Set((notice.attachmentUrls || []).filter(Boolean)))
  };
}

export function extractRequiredItems(text: string): string[] {
  const normalized = text.toLowerCase();
  return itemDictionary.filter((item) => normalized.includes(item.toLowerCase()));
}

function inferCategory(text: string): SourceCategory {
  const normalized = text.toLowerCase();
  const match = categoryKeywords.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.category || "public";
}

function inferBuyer(sourceName: string): string {
  if (sourceName.includes("가스공사")) return "한국가스공사";
  if (sourceName.includes("전력") || sourceName.includes("한전")) return "한국전력공사";
  if (sourceName.includes("LH")) return "한국토지주택공사";
  if (sourceName.includes("현대")) return "HD현대중공업";
  return sourceName;
}

function inferWorkType(text: string): string {
  if (text.includes("협력") || text.includes("모집")) return "협력사 모집";
  if (text.includes("공사")) return "공사";
  if (text.includes("용역")) return "용역";
  if (text.includes("물품") || text.includes("구매")) return "물품";
  return "입찰/공고";
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const compact = value.replace(/[^\d]/g, "");
  if (compact.length >= 8) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function normalizeAmount(value?: number | string): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return undefined;
  const numeric = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function formatKrw(value: number): string {
  if (value >= 100000000) {
    return `약 ${(value / 100000000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`;
  }
  if (value >= 10000) {
    return `약 ${(value / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

function extractKeywords(text: string): string[] {
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2 && word.length <= 12);
  return unique(words).slice(0, 8);
}

function buildSummary(
  recordKind: "bid" | "award",
  title: string,
  buyer: string,
  requiredItems: string[],
  description: string,
  award?: { winnerName?: string; awardAmount?: number; awardRate?: string; awardedAt?: string }
): string {
  if (recordKind === "award") {
    const winner = award?.winnerName ? ` 낙찰업체는 ${award.winnerName}` : " 낙찰업체 정보는 원문에서 확인";
    const amount = award?.awardAmount ? `, 낙찰금액은 ${formatKrw(award.awardAmount)}` : "";
    const rate = award?.awardRate ? `, 낙찰률은 ${award.awardRate}%` : "";
    const date = award?.awardedAt ? ` 최종낙찰일은 ${award.awardedAt}입니다.` : "";
    return `${buyer}의 "${title}" 낙찰결과입니다.${winner}${amount}${rate}.${date}`;
  }

  if (description.length > 40) {
    return `${description.slice(0, 140)}${description.length > 140 ? "..." : ""}`;
  }
  const itemText = requiredItems.length ? ` 주요 품목은 ${requiredItems.slice(0, 3).join(", ")}입니다.` : "";
  return `${buyer}에서 공개한 "${title}" 공고입니다.${itemText}`;
}

function buildStoredOpportunitySummary(opportunity: Opportunity): string {
  if (opportunity.recordKind === "award") {
    const winner = opportunity.award?.winnerName ? ` 낙찰업체는 ${opportunity.award.winnerName}` : " 낙찰업체 정보는 원문에서 확인이 필요합니다";
    const amount = opportunity.award?.awardAmount ? `, 낙찰금액은 ${formatKrw(opportunity.award.awardAmount)}` : "";
    const rate = opportunity.award?.awardRate ? `, 낙찰률은 ${opportunity.award.awardRate}%` : "";
    return `${opportunity.buyer}의 "${opportunity.title}" 낙찰결과입니다.${winner}${amount}${rate}.`;
  }

  const itemText = opportunity.requiredItems.length
    ? ` 주요 품목은 ${opportunity.requiredItems.slice(0, 3).join(", ")}입니다.`
    : "";
  const amountText = opportunity.amount ? ` 예상 금액은 ${formatKrw(opportunity.amount)}입니다.` : "";
  const deadlineText = opportunity.deadline ? ` 마감일은 ${opportunity.deadline}입니다.` : "";
  return `${opportunity.buyer}에서 공개한 "${opportunity.title}" 입찰공고입니다.${itemText}${amountText}${deadlineText}`;
}

function isRawJsonText(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  return /"[^"]+"\s*:/.test(trimmed.slice(0, 300));
}

function calculateTrustScore(
  sourceReliability: number,
  originalUrl: string,
  deadline?: string,
  itemCount = 0,
  recordKind: "bid" | "award" = "bid"
): number {
  let score = Math.min(100, Math.max(40, sourceReliability));
  if (originalUrl.includes("data.go.kr") || originalUrl.includes("kogas.or.kr")) score += 3;
  if (deadline) score += 4;
  if (itemCount > 0) score += 3;
  if (recordKind === "award") score -= 4;
  return Math.min(98, score);
}

function buildOpportunityId(sourceId: string, title: string, buyer: string, discriminator: string): string {
  const base = `${sourceId}-${title}-${buyer}-${discriminator}`.toLowerCase();
  let hash = 0;
  for (let index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) >>> 0;
  }
  return `${sourceId}-${hash.toString(16)}`;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => cleanText(value)).filter(Boolean)));
}
