export type SourceCategory = "public" | "power-gas-facility" | "construction-civil" | "enterprise-public";

export type SourceMode = "api" | "public-page" | "sample";

export type SourceStatus = "ready" | "needs-api-key" | "ok" | "partial" | "failed";

export type OpportunityStatus = "new" | "interested" | "contact-planned" | "excluded";

export type OpportunityRecordKind = "bid" | "award";

export type DataQualityStatus = "ok" | "needs-review" | "insufficient" | "expired";

export type QualityCheckStatus = "present" | "missing" | "warning";

export type ChecklistKey =
  | "sourceChecked"
  | "attachmentChecked"
  | "qualificationChecked"
  | "amountReviewed"
  | "buyerContacted"
  | "scheduleChecked";

export type ReviewChecklist = Record<ChecklistKey, boolean>;

export interface AwardDetails {
  winnerName?: string;
  winnerBusinessNo?: string;
  winnerCeoName?: string;
  winnerAddress?: string;
  winnerPhone?: string;
  awardAmount?: number;
  awardRate?: string;
  openedAt?: string;
  awardedAt?: string;
  participantCount?: number;
}

export interface NoticeDetails {
  noticeNo?: string;
  noticeOrder?: string;
  noticeAgency?: string;
  demandAgency?: string;
  estimatedPrice?: number;
  budgetAmount?: number;
  bidStartAt?: string;
  bidCloseAt?: string;
  openAt?: string;
  publishedAt?: string;
  contractMethod?: string;
  bidMethod?: string;
  noticeKind?: string;
  referenceNo?: string;
  productClassName?: string;
  industryName?: string;
  attachmentUrls: string[];
}

export interface Source {
  id: string;
  name: string;
  category: SourceCategory;
  mode: SourceMode;
  url: string;
  requiresApiKey: boolean;
  reliability: number;
  lastCollectedAt?: string;
  status: SourceStatus;
  note: string;
  lastCollectedCount?: number;
  lastDedupedCount?: number;
  lastStatusMessage?: string;
  lastError?: string;
}

export interface Opportunity {
  id: string;
  recordKind: OpportunityRecordKind;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceReliability: number;
  title: string;
  buyer: string;
  category: SourceCategory;
  workType: string;
  region: string;
  amount?: number;
  amountLabel: string;
  deadline?: string;
  publishedAt?: string;
  originalUrl: string;
  keywords: string[];
  requiredItems: string[];
  summary: string;
  trustScore: number;
  riskFlags: string[];
  notice?: NoticeDetails;
  award?: AwardDetails;
  collectedAt: string;
}

export interface CompanyProfile {
  name: string;
  targetCategories: SourceCategory[];
  targetBuyers: string[];
  targetRegions: string[];
  suppliedItems: string[];
  excludedKeywords: string[];
  certifications: string[];
  pastPerformances: string[];
  equipment: string[];
  personnel: string[];
  partnerBuyers: string[];
  unavailableConditions: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface EvidenceItem {
  label: string;
  impact: "positive" | "negative" | "neutral";
  points: number;
  detail: string;
}

export interface MatchScoreBreakdown {
  item: number;
  agency: number;
  amount: number;
  timeline: number;
  source: number;
  quality: number;
  capability: number;
}

export interface MatchResult {
  opportunityId: string;
  score: number;
  breakdown: MatchScoreBreakdown;
  reasons: EvidenceItem[];
  penalties: EvidenceItem[];
}

export interface SavedOpportunity {
  opportunityId: string;
  status: OpportunityStatus;
  note: string;
  nextActionDate?: string;
  ownerNote?: string;
  excludeReason?: string;
  checklist?: ReviewChecklist;
  savedAt: string;
  updatedAt?: string;
}

export interface CollectionResult {
  sourceId: string;
  status: SourceStatus;
  collectedCount: number;
  dedupedCount?: number;
  message: string;
  collectedAt: string;
}

export interface DataQualityCheck {
  key: string;
  label: string;
  status: QualityCheckStatus;
  detail: string;
}

export interface DataQualityReport {
  status: DataQualityStatus;
  label: string;
  score: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  checks: DataQualityCheck[];
}

export interface LinkedAwardSummary {
  opportunityId: string;
  winnerName?: string;
  awardAmount?: number;
  awardRate?: string;
  openedAt?: string;
  awardedAt?: string;
  participantCount?: number;
}

export interface AgencyAwardInsight {
  agencyName: string;
  averageAwardRate?: number;
  repeatedWinners: Array<{ winnerName: string; count: number }>;
  awardCount: number;
}

export interface AppState {
  sources: Source[];
  opportunities: Opportunity[];
  profile: CompanyProfile;
  matches: MatchResult[];
  saved: SavedOpportunity[];
  collectionResults: CollectionResult[];
}

export interface RawOpportunityRecord {
  sourceId: string;
  recordKind?: OpportunityRecordKind;
  sourceName: string;
  sourceUrl: string;
  sourceReliability: number;
  category: SourceCategory;
  title?: string;
  buyer?: string;
  workType?: string;
  region?: string;
  amount?: number | string;
  amountLabel?: string;
  deadline?: string;
  publishedAt?: string;
  originalUrl?: string;
  description?: string;
  keywords?: string[];
  requiredItems?: string[];
  riskFlags?: string[];
  notice?: NoticeDetails;
  award?: AwardDetails;
}
