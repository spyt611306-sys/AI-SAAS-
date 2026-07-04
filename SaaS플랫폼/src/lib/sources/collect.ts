import { addCollectionResults, getSources, updateSources, upsertOpportunities } from "@/lib/db";
import { normalizeRecords } from "@/lib/normalization";
import { getAdapter } from "@/lib/sources/registry";
import { buildResult } from "@/lib/sources/types";
import { CollectionResult } from "@/lib/types";

export async function collectAllSources(): Promise<CollectionResult[]> {
  const sources = getSources();
  const nextSources = [...sources];
  const results: CollectionResult[] = [];
  const allRecords = [];
  const collectedSources = new Map<string, (typeof sources)[number]>();

  for (const source of sources) {
    const adapter = getAdapter(source.id);
    if (!adapter) {
      results.push(buildResult(source.id, "failed", 0, "이 출처에 연결된 어댑터가 없습니다."));
      continue;
    }

    const response = await adapter.collect(source);
    allRecords.push(...response.records);
    results.push(response.result);
    collectedSources.set(source.id, response.source);
  }

  const opportunities = normalizeRecords(allRecords);
  const dedupedBySource = opportunities.reduce((map, opportunity) => {
    map.set(opportunity.sourceId, (map.get(opportunity.sourceId) || 0) + 1);
    return map;
  }, new Map<string, number>());

  const finalResults = results.map((result) => ({
    ...result,
    dedupedCount: dedupedBySource.get(result.sourceId) || 0,
    message:
      result.collectedCount > 0
        ? `${result.message} / 중복 제거 후 ${dedupedBySource.get(result.sourceId) || 0}건 반영`
        : result.message
  }));

  for (const result of finalResults) {
    const source = collectedSources.get(result.sourceId) || nextSources.find((item) => item.id === result.sourceId);
    if (!source) continue;
    const index = nextSources.findIndex((item) => item.id === source.id);
    if (index >= 0) {
      nextSources[index] = {
        ...source,
        lastCollectedAt: result.collectedAt,
        lastCollectedCount: result.collectedCount,
        lastDedupedCount: result.dedupedCount,
        lastStatusMessage: result.message,
        lastError: result.status === "failed" ? result.message : undefined
      };
    }
  }

  if (opportunities.length) {
    upsertOpportunities(opportunities);
  }

  updateSources(nextSources);
  addCollectionResults(finalResults);
  return finalResults;
}
