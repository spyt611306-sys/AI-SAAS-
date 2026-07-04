import { OpportunityRecordKind, RawOpportunityRecord, Source } from "@/lib/types";
import { AdapterResponse, buildResult, SourceAdapter } from "@/lib/sources/types";

interface ApiOperation {
  name: string;
  label: string;
  workType: string;
  recordKind: OpportunityRecordKind;
}

interface ApiConfig {
  sourceId: string;
  envKeys: string[];
  baseUrl?: string;
  endpoint?: string;
  operations?: ApiOperation[];
  note: string;
}

const ppsBidBaseUrl =
  process.env.PPS_BID_SERVICE_BASE_URL || "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const ppsAwardBaseUrl =
  process.env.PPS_AWARD_SERVICE_BASE_URL || "https://apis.data.go.kr/1230000/as/ScsbidInfoService";

const configs: Record<string, ApiConfig> = {
  "pps-bid": {
    sourceId: "pps-bid",
    envKeys: ["NARA_BID_SERVICE_KEY", "DATA_GO_KR_SERVICE_KEY"],
    baseUrl: ppsBidBaseUrl,
    operations: [
      { name: "getBidPblancListInfoThng", label: "물품 입찰공고", workType: "물품", recordKind: "bid" },
      { name: "getBidPblancListInfoCnstwk", label: "공사 입찰공고", workType: "공사", recordKind: "bid" },
      { name: "getBidPblancListInfoServc", label: "용역 입찰공고", workType: "용역", recordKind: "bid" },
      { name: "getBidPblancListInfoFrgcpt", label: "외자 입찰공고", workType: "외자", recordKind: "bid" }
    ],
    note: "나라장터 입찰공고 4개 업무구분을 최근 조회 기간 기준으로 수집합니다."
  },
  "pps-award": {
    sourceId: "pps-award",
    envKeys: ["NARA_AWARD_SERVICE_KEY", "DATA_GO_KR_SERVICE_KEY"],
    baseUrl: ppsAwardBaseUrl,
    operations: [
      { name: "getScsbidListSttusThng", label: "물품 낙찰결과", workType: "물품 낙찰결과", recordKind: "award" },
      { name: "getScsbidListSttusCnstwk", label: "공사 낙찰결과", workType: "공사 낙찰결과", recordKind: "award" },
      { name: "getScsbidListSttusServc", label: "용역 낙찰결과", workType: "용역 낙찰결과", recordKind: "award" },
      { name: "getScsbidListSttusFrgcpt", label: "외자 낙찰결과", workType: "외자 낙찰결과", recordKind: "award" }
    ],
    note: "나라장터 낙찰정보 4개 업무구분을 시장/경쟁사 참고 데이터로 수집합니다."
  },
  "pps-plan": {
    sourceId: "pps-plan",
    envKeys: ["DATA_GO_KR_SERVICE_KEY"],
    endpoint: process.env.PPS_PLAN_ENDPOINT,
    note: "나라장터 발주계획 API는 별도 엔드포인트를 PPS_PLAN_ENDPOINT로 지정하면 연결됩니다."
  },
  "lh-bid": {
    sourceId: "lh-bid",
    envKeys: ["DATA_GO_KR_SERVICE_KEY"],
    endpoint: process.env.LH_BID_ENDPOINT,
    note: "LH 입찰공고 API는 별도 엔드포인트를 LH_BID_ENDPOINT로 지정하면 연결됩니다."
  },
  "kepco-api": {
    sourceId: "kepco-api",
    envKeys: ["KEPCO_API_KEY"],
    endpoint: process.env.KEPCO_BID_ENDPOINT,
    note: "한전 전자입찰계약정보는 전력데이터개방포털의 실제 API URL을 KEPCO_BID_ENDPOINT로 지정하면 연결됩니다."
  }
};

export class DataGoKrAdapter implements SourceAdapter {
  sourceId: string;

  constructor(sourceId: string) {
    this.sourceId = sourceId;
  }

  async collect(source: Source): Promise<AdapterResponse> {
    const config = configs[this.sourceId];
    const apiKey = config ? readFirstEnv(config.envKeys) : undefined;

    if (!config || !apiKey) {
      return {
        source: {
          ...source,
          status: "needs-api-key",
          note: config?.note || "API 키가 필요합니다."
        },
        records: [],
        result: buildResult(source.id, "needs-api-key", 0, "API 키가 없어 기존 샘플/공개 데이터로 대체합니다.")
      };
    }

    if (config.operations?.length && config.baseUrl) {
      return collectPpsOperations(source, config, apiKey);
    }

    if (config.endpoint) {
      return collectGenericEndpoint(source, config, apiKey);
    }

    return {
      source: {
        ...source,
        status: "needs-api-key",
        note: config.note
      },
      records: [],
      result: buildResult(source.id, "needs-api-key", 0, "API 키는 있지만 실제 엔드포인트 환경변수가 아직 없습니다.")
    };
  }
}

function readFirstEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

async function collectPpsOperations(source: Source, config: ApiConfig, apiKey: string): Promise<AdapterResponse> {
  const queryWindow = getQueryWindow();
  const records: RawOpportunityRecord[] = [];
  const messages: string[] = [];
  let failedCount = 0;

  for (const operation of config.operations || []) {
    try {
      const data = await requestPpsOperation(config.baseUrl || source.url, operation.name, apiKey, queryWindow);
      const apiStatus = readApiStatus(data);

      if (apiStatus.code && apiStatus.code !== "00") {
        messages.push(`${operation.label}: ${apiStatus.message || explainApiError(apiStatus.code)}`);
        continue;
      }

      const items = extractItems(data);
      records.push(...mapPpsItems(source, operation, items));
      messages.push(`${operation.label}: ${items.length}건`);
    } catch (error) {
      failedCount += 1;
      messages.push(`${operation.label}: ${toFriendlyApiError(error)}`);
    }
  }

  const status = records.length ? (failedCount ? "partial" : "ok") : failedCount ? "failed" : "partial";
  const note = records.length
    ? `${records.length}건 수집. ${messages.join(" / ")}`
    : `${messages.join(" / ")}. 활용신청 승인, 서비스별 권한, 등록 IP/도메인, 인증키 상태를 확인하세요.`;

  return {
    source: {
      ...source,
      status,
      lastCollectedAt: new Date().toISOString(),
      note
    },
    records,
    result: buildResult(source.id, status, records.length, note)
  };
}

async function collectGenericEndpoint(source: Source, config: ApiConfig, apiKey: string): Promise<AdapterResponse> {
  try {
    const url = new URL(config.endpoint || source.url);
    url.searchParams.set("ServiceKey", apiKey);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "30");
    url.searchParams.set("type", "json");

    const data = await fetchJson(url);
    const records = mapGenericApiItems(source, extractItems(data));
    return {
      source: {
        ...source,
        status: records.length ? "ok" : "partial",
        lastCollectedAt: new Date().toISOString(),
        note: records.length ? "API에서 실데이터를 수집했습니다." : "API 응답은 받았지만 공고 항목을 찾지 못했습니다."
      },
      records,
      result: buildResult(source.id, records.length ? "ok" : "partial", records.length, "공공 API 수집을 완료했습니다.")
    };
  } catch (error) {
    return {
      source: {
        ...source,
        status: "failed",
        lastCollectedAt: new Date().toISOString(),
        note: `API 수집 실패: ${toFriendlyApiError(error)}`
      },
      records: [],
      result: buildResult(source.id, "failed", 0, "API 호출 실패로 기존 데이터를 유지합니다.")
    };
  }
}

async function requestPpsOperation(
  baseUrl: string,
  operationName: string,
  apiKey: string,
  queryWindow: { begin: string; end: string }
): Promise<unknown> {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${operationName}`);
  url.searchParams.set("ServiceKey", apiKey);
  url.searchParams.set("type", "json");
  url.searchParams.set("inqryDiv", "1");
  url.searchParams.set("inqryBgnDt", queryWindow.begin);
  url.searchParams.set("inqryEndDt", queryWindow.end);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "30");
  return fetchJson(url);
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "ProjectRadarPrototype/0.1"
    },
    cache: "no-store"
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${body ? ` ${body.slice(0, 180)}` : ""}`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`JSON 파싱 실패: ${body.slice(0, 180)}`);
  }
}

function getQueryWindow(): { begin: string; end: string } {
  const days = Number(process.env.PPS_LOOKBACK_DAYS || "7");
  const end = new Date();
  const begin = new Date(end);
  begin.setDate(end.getDate() - Math.max(1, Math.min(days, 30)));
  return {
    begin: `${formatDate(begin)}0000`,
    end: `${formatDate(end)}2359`
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function readApiStatus(data: unknown): { code?: string; message?: string } {
  if (!data || typeof data !== "object") return {};
  const response = (data as Record<string, unknown>).response;
  if (!response || typeof response !== "object") return {};
  const header = (response as Record<string, unknown>).header;
  if (!header || typeof header !== "object") return {};
  return {
    code: pickString(header as Record<string, unknown>, ["resultCode"]),
    message: pickString(header as Record<string, unknown>, ["resultMsg"])
  };
}

function extractItems(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];
  const object = data as Record<string, unknown>;
  const candidates = [
    object.response,
    object.body,
    object.items,
    object.item,
    object.data,
    object.list
  ];

  for (const candidate of candidates) {
    const result = drillItems(candidate);
    if (result.length) return result;
  }

  return drillItems(object);
}

function drillItems(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (!isRecord(value)) return [];
  if (Array.isArray(value.item)) return value.item.filter(isRecord);
  if (Array.isArray(value.items)) return value.items.filter(isRecord);
  for (const child of Object.values(value)) {
    const result = drillItems(child);
    if (result.length) return result;
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapPpsItems(source: Source, operation: ApiOperation, items: Record<string, unknown>[]): RawOpportunityRecord[] {
  return items.slice(0, 30).map((item) =>
    operation.recordKind === "award"
      ? mapPpsAwardItem(source, operation, item)
      : mapPpsBidItem(source, operation, item)
  );
}

function mapPpsBidItem(source: Source, operation: ApiOperation, item: Record<string, unknown>): RawOpportunityRecord {
  const attachmentUrls = pickAttachmentUrls(item);
  const estimatedPrice = normalizeNumber(pickString(item, ["presmptPrce"]));
  const budgetAmount = normalizeNumber(pickString(item, ["asignBdgtAmt", "bdgtAmt"]));

  return {
    sourceId: source.id,
    recordKind: "bid",
    sourceName: source.name,
    sourceUrl: source.url,
    sourceReliability: source.reliability,
    category: source.category,
    title: pickString(item, ["bidNtceNm"]),
    buyer: pickString(item, ["dminsttNm", "ntceInsttNm"]),
    workType: pickString(item, ["bsnsDivNm", "bidMethdNm"]) || operation.workType,
    region: pickString(item, ["prtcptLmtRgnNm", "areaNm"]) || "전국",
    amount: estimatedPrice || budgetAmount,
    deadline: pickString(item, ["bidClseDt", "bidQlfctRgstDt"]),
    publishedAt: pickString(item, ["bidNtceDt", "rgstDt"]),
    originalUrl: pickString(item, ["bidNtceDtlUrl"]) || attachmentUrls[0] || source.url,
    description: buildDescription([
      ["공고기관", pickString(item, ["ntceInsttNm"])],
      ["수요기관", pickString(item, ["dminsttNm"])],
      ["계약방법", pickString(item, ["cntrctCnclsMthdNm"])],
      ["입찰방법", pickString(item, ["bidMethdNm"])],
      ["마감일", pickString(item, ["bidClseDt", "bidQlfctRgstDt"])],
      ["추정가격", estimatedPrice ? `${estimatedPrice.toLocaleString("ko-KR")}원` : undefined],
      ["예산금액", budgetAmount ? `${budgetAmount.toLocaleString("ko-KR")}원` : undefined]
    ]),
    keywords: [
      operation.workType,
      pickString(item, ["ntceKindNm"]),
      pickString(item, ["cntrctCnclsMthdNm"]),
      pickString(item, ["bidMethdNm"])
    ].filter(Boolean) as string[],
    requiredItems: [
      pickString(item, ["prdctClsfcNoNm"]),
      pickString(item, ["dtilPrdctClsfcNoNm"]),
      pickString(item, ["indstrytyNm"])
    ].filter(Boolean) as string[],
    notice: {
      noticeNo: pickString(item, ["bidNtceNo"]),
      noticeOrder: pickString(item, ["bidNtceOrd"]),
      noticeAgency: pickString(item, ["ntceInsttNm"]),
      demandAgency: pickString(item, ["dminsttNm"]),
      estimatedPrice,
      budgetAmount,
      bidStartAt: pickString(item, ["bidBeginDt"]),
      bidCloseAt: pickString(item, ["bidClseDt", "bidQlfctRgstDt"]),
      openAt: pickString(item, ["opengDt"]),
      publishedAt: pickString(item, ["bidNtceDt", "rgstDt"]),
      contractMethod: pickString(item, ["cntrctCnclsMthdNm"]),
      bidMethod: pickString(item, ["bidMethdNm"]),
      noticeKind: pickString(item, ["ntceKindNm"]),
      referenceNo: pickString(item, ["refNo"]),
      productClassName: pickString(item, ["prdctClsfcNoNm", "dtilPrdctClsfcNoNm"]),
      industryName: pickString(item, ["indstrytyNm"]),
      attachmentUrls
    }
  };
}

function mapPpsAwardItem(source: Source, operation: ApiOperation, item: Record<string, unknown>): RawOpportunityRecord {
  const awardAmount = normalizeNumber(pickString(item, ["sucsfbidAmt"]));
  const awardedAt = pickString(item, ["fnlSucsfDate"]);
  const openedAt = pickString(item, ["rlOpengDt", "opengDt"]);
  const noticeNo = pickString(item, ["bidNtceNo"]);
  const noticeOrder = pickString(item, ["bidNtceOrd"]);

  return {
    sourceId: source.id,
    recordKind: "award",
    sourceName: source.name,
    sourceUrl: source.url,
    sourceReliability: source.reliability,
    category: source.category,
    title: pickString(item, ["bidNtceNm"]),
    buyer: pickString(item, ["dminsttNm", "ntceInsttNm"]),
    workType: operation.workType,
    region: pickRegionFromAddress(pickString(item, ["bidwinnrAdrs"])) || "전국",
    amount: awardAmount,
    amountLabel: awardAmount ? `낙찰금액 ${awardAmount.toLocaleString("ko-KR")}원` : undefined,
    publishedAt: awardedAt || openedAt || pickString(item, ["rgstDt", "inptDt"]),
    originalUrl: source.url,
    description: buildDescription([
      ["수요기관", pickString(item, ["dminsttNm"])],
      ["공고기관", pickString(item, ["ntceInsttNm"])],
      ["낙찰업체", pickString(item, ["bidwinnrNm"])],
      ["낙찰금액", awardAmount ? `${awardAmount.toLocaleString("ko-KR")}원` : undefined],
      ["낙찰률", pickString(item, ["sucsfbidRate"])],
      ["개찰일", openedAt],
      ["최종낙찰일", awardedAt]
    ]),
    keywords: [operation.workType, pickString(item, ["progrsDivCdNm"]), "낙찰결과"].filter(Boolean) as string[],
    requiredItems: [],
    riskFlags: ["이미 종료된 낙찰결과입니다. 시장/경쟁사 참고 데이터로 활용하세요."],
    notice: {
      noticeNo,
      noticeOrder,
      noticeAgency: pickString(item, ["ntceInsttNm"]),
      demandAgency: pickString(item, ["dminsttNm"]),
      publishedAt: pickString(item, ["rgstDt", "inptDt"]),
      openAt: openedAt,
      attachmentUrls: []
    },
    award: {
      winnerName: pickString(item, ["bidwinnrNm"]),
      winnerBusinessNo: pickString(item, ["bidwinnrBizno"]),
      winnerCeoName: pickString(item, ["bidwinnrCeoNm"]),
      winnerAddress: pickString(item, ["bidwinnrAdrs"]),
      winnerPhone: pickString(item, ["bidwinnrTelNo"]),
      awardAmount,
      awardRate: pickString(item, ["sucsfbidRate"]),
      openedAt,
      awardedAt,
      participantCount: normalizeNumber(pickString(item, ["prtcptCnum"]))
    }
  };
}

function mapGenericApiItems(source: Source, items: Record<string, unknown>[]): RawOpportunityRecord[] {
  return items.slice(0, 30).map((item) => ({
    sourceId: source.id,
    recordKind: "bid",
    sourceName: source.name,
    sourceUrl: source.url,
    sourceReliability: source.reliability,
    category: source.category,
    title: pickString(item, ["bidNtceNm", "bidnmKor", "bidName", "title", "공고명", "입찰공고명", "발주명"]),
    buyer: pickString(item, ["ntceInsttNm", "dminsttNm", "buyer", "기관명", "수요기관", "발주기관"]),
    workType: pickString(item, ["bsnsDivNm", "bidMethdNm", "업무구분", "사업구분", "입찰구분"]),
    region: pickString(item, ["areaNm", "region", "담당지역", "지역", "zoneHqCd"]),
    amount: pickString(item, ["asignBdgtAmt", "presmptPrce", "budget", "amount", "추정가격", "발주금액"]),
    deadline: pickString(item, ["bidClseDt", "bidEndDate", "입찰종료일", "입찰마감일자", "마감일시"]),
    publishedAt: pickString(item, ["bidNtceDt", "rgstDt", "공고게시일자", "공고일자"]),
    originalUrl: pickString(item, ["bidNtceDtlUrl", "url", "link"]) || source.url,
    description: buildGenericDescription(item)
  }));
}

function pickString(item: Record<string, unknown>, keys: string[]): string | undefined {
  const key = keys.find((candidate) => item[candidate] !== undefined && item[candidate] !== null);
  return key ? String(item[key]).trim() : undefined;
}

function buildGenericDescription(item: Record<string, unknown>): string {
  return buildDescription([
    ["공고명", pickString(item, ["bidNtceNm", "bidnmKor", "bidName", "title", "공고명", "입찰공고명", "발주명"])],
    ["기관", pickString(item, ["ntceInsttNm", "dminsttNm", "buyer", "기관명", "수요기관", "발주기관"])],
    ["업무", pickString(item, ["bsnsDivNm", "bidMethdNm", "업무구분", "사업구분", "입찰구분"])],
    ["지역", pickString(item, ["areaNm", "region", "해당지역", "지역", "zoneHqCd"])],
    ["금액", pickString(item, ["asignBdgtAmt", "presmptPrce", "budget", "amount", "추정가격", "발주금액"])],
    ["마감", pickString(item, ["bidClseDt", "bidEndDate", "입찰종료일", "입찰마감일자", "마감일시"])]
  ]);
}

function buildDescription(parts: Array<[string, string | undefined]>): string {
  return parts
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join(" / ");
}

function pickAttachmentUrls(item: Record<string, unknown>): string[] {
  const candidates = [
    "bidNtceDtlUrl",
    "ntceSpecDocUrl1",
    "ntceSpecDocUrl2",
    "ntceSpecDocUrl3",
    "ntceSpecDocUrl4",
    "ntceSpecDocUrl5",
    "ntceSpecDocUrl6",
    "ntceSpecDocUrl7",
    "ntceSpecDocUrl8",
    "ntceSpecDocUrl9",
    "ntceSpecDocUrl10",
    "atchFileUrl"
  ];
  return Array.from(
    new Set(
      candidates
        .map((key) => pickString(item, [key]))
        .filter((value): value is string => Boolean(value && value.startsWith("http")))
    )
  );
}

function normalizeNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function pickRegionFromAddress(address?: string): string | undefined {
  if (!address) return undefined;
  const match = address.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)/);
  return match?.[1];
}

function toFriendlyApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("HTTP 403")) {
    return "HTTP 403 - 활용신청 승인, 서비스별 권한, 등록 IP/도메인, 인증키 상태를 확인하세요.";
  }
  return message;
}

function explainApiError(code: string): string {
  const errors: Record<string, string> = {
    "03": "데이터 없음",
    "06": "날짜 형식 오류",
    "07": "입력 범위 초과",
    "08": "필수값 누락",
    "10": "ServiceKey 누락 또는 요청 파라미터 오류",
    "11": "필수 요청 파라미터 누락",
    "12": "서비스 URL 또는 오퍼레이션 오류",
    "20": "서비스 접근 거부 - 활용신청 승인 상태 확인 필요",
    "22": "일일 요청 제한 초과",
    "30": "등록되지 않은 서비스 키",
    "31": "기한 만료된 서비스 키",
    "32": "등록되지 않은 도메인명 또는 IP주소"
  };
  return errors[code] || `API 오류 코드 ${code}`;
}
