import { CollectionResult, RawOpportunityRecord, Source } from "@/lib/types";

export interface AdapterResponse {
  source: Source;
  records: RawOpportunityRecord[];
  result: CollectionResult;
}

export interface SourceAdapter {
  sourceId: string;
  collect(source: Source): Promise<AdapterResponse>;
}

export function buildResult(
  sourceId: string,
  status: CollectionResult["status"],
  collectedCount: number,
  message: string
): CollectionResult {
  return {
    sourceId,
    status,
    collectedCount,
    message,
    collectedAt: new Date().toISOString()
  };
}
