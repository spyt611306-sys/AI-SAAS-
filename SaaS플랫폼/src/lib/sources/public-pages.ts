import { RawOpportunityRecord, Source } from "@/lib/types";
import { AdapterResponse, buildResult, SourceAdapter } from "@/lib/sources/types";

export class PublicPageAdapter implements SourceAdapter {
  sourceId: string;

  constructor(sourceId: string) {
    this.sourceId = sourceId;
  }

  async collect(source: Source): Promise<AdapterResponse> {
    try {
      const response = await fetch(source.url, {
        headers: {
          Accept: "text/html, */*",
          "User-Agent": "ProjectRadarPrototype/0.1"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const records = parsePublicPage(source, html);
      return {
        source: {
          ...source,
          status: records.length ? "ok" : "partial",
          lastCollectedAt: new Date().toISOString(),
          note: records.length
            ? `공개 페이지에서 ${records.length}건을 수집했습니다.`
            : "공개 페이지에 현재 수집 가능한 공고가 없습니다."
        },
        records,
        result: buildResult(
          source.id,
          records.length ? "ok" : "partial",
          records.length,
          records.length ? "공개 페이지 수집을 완료했습니다." : "공개 페이지는 접근됐지만 신규 공고가 없습니다."
        )
      };
    } catch (error) {
      return {
        source: {
          ...source,
          status: "failed",
          lastCollectedAt: new Date().toISOString(),
          note: `공개 페이지 수집 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
        },
        records: [],
        result: buildResult(source.id, "failed", 0, "공개 페이지 수집 실패로 기존 데이터를 유지합니다.")
      };
    }
  }
}

function parsePublicPage(source: Source, html: string): RawOpportunityRecord[] {
  if (source.id === "kogas-page") return parseKogas(source, html);
  if (source.id === "ecredible-page") return parseEcredible(source, html);
  if (source.id === "hhi-page") return parseHhi(source, html);
  return [];
}

function parseKogas(source: Source, html: string): RawOpportunityRecord[] {
  const text = toReadableText(html);
  const records: RawOpportunityRecord[] = [];
  const pattern =
    /(\d{10})\s+(.+?)\s+전자입찰\s+(물품|공사|용역)\s+([^\s]+)\s+(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}\s+(\d{4}-\d{2}-\d{2})/g;
  let match = pattern.exec(text);

  while (match && records.length < 20) {
    records.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      sourceReliability: source.reliability,
      category: source.category,
      title: match[2],
      buyer: "한국가스공사",
      workType: match[3],
      region: inferRegion(match[2]),
      deadline: match[5],
      originalUrl: source.url,
      description: `입찰번호 ${match[1]}, 계약방법 ${match[4]}, 개찰일 ${match[6]}`
    });
    match = pattern.exec(text);
  }

  return records;
}

function parseEcredible(source: Source, html: string): RawOpportunityRecord[] {
  const text = toReadableText(html);
  const records: RawOpportunityRecord[] = [];
  const pattern = /(진행|완료)\s+(.+?)\s+(\d{4}\.\d{2}\.\d{2})\s*~\s*(\d{4}\.\d{2}\.\d{2})/g;
  let match = pattern.exec(text);

  while (match && records.length < 20) {
    records.push({
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      sourceReliability: source.reliability,
      category: source.category,
      title: match[2],
      buyer: inferEnterpriseBuyer(match[2]),
      workType: "협력사 모집",
      region: "전국",
      publishedAt: match[3].replaceAll(".", "-"),
      deadline: match[4].replaceAll(".", "-"),
      originalUrl: source.url,
      description: `${match[1]} 상태의 협력업체 공개 모집공고입니다.`,
      riskFlags: match[1] === "완료" ? ["모집 완료 공고"] : []
    });
    match = pattern.exec(text);
  }

  return records;
}

function parseHhi(source: Source, html: string): RawOpportunityRecord[] {
  const text = toReadableText(html);
  if (text.includes("등록된 게시물이 없습니다")) {
    return [];
  }

  const records: RawOpportunityRecord[] = [];
  const pattern = /(\d{4}\.\d{2}\.\d{2})\s+(.+?)(?=\s+\d{4}\.\d{2}\.\d{2}|$)/g;
  let match = pattern.exec(text);

  while (match && records.length < 10) {
    const title = match[2].trim();
    if (title.length > 4 && !title.includes("개인정보처리방침")) {
      records.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        sourceReliability: source.reliability,
        category: source.category,
        title,
        buyer: "HD현대중공업",
        workType: "입찰공고",
        region: "울산",
        publishedAt: match[1].replaceAll(".", "-"),
        originalUrl: source.url,
        description: "HD현대중공업 공개 입찰공고 페이지에서 감지된 항목입니다."
      });
    }
    match = pattern.exec(text);
  }

  return records;
}

function toReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function inferRegion(title: string): string {
  if (title.includes("대전") || title.includes("충청")) return "대전/충청";
  if (title.includes("평택")) return "평택";
  if (title.includes("인천")) return "인천";
  if (title.includes("부산")) return "부산";
  return "전국";
}

function inferEnterpriseBuyer(title: string): string {
  const candidates = ["CJ대한통운", "쌍용건설", "일성건설", "호반건설", "신세계건설", "한화오션", "포스코이앤씨"];
  return candidates.find((candidate) => title.includes(candidate)) || "대기업/건설사";
}
