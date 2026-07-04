"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import { categoryLabel } from "@/components/project-radar/constants";
import { StatusBadge } from "@/components/project-radar/shared";
import { Source } from "@/lib/types";

export function SourceMonitor({ sources }: { sources: Source[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Source Monitor</h2>
        <ShieldCheck className="h-4 w-4 text-[#1f6f5b]" />
      </div>
      <div className="space-y-2">
        {sources.map((source) => (
          <div key={source.id} className="rounded-md border border-[#e7ecf1] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{source.name}</div>
                <div className="mt-1 text-xs text-[#697783]">{categoryLabel[source.category]}</div>
              </div>
              <StatusBadge status={source.status} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[#697783]">
              <span>
                신뢰도 {source.reliability}
                {typeof source.lastCollectedCount === "number" ? ` · 수집 ${source.lastCollectedCount}건` : ""}
                {typeof source.lastDedupedCount === "number" ? ` · 반영 ${source.lastDedupedCount}건` : ""}
              </span>
              <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1f6f5b]">
                출처 <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {source.lastStatusMessage ? (
              <div className="mt-2 line-clamp-2 text-xs leading-5 text-[#697783]">{source.lastStatusMessage}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
