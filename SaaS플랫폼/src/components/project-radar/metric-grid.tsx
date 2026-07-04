"use client";

import { BookmarkCheck, Database, FileSearch, Sparkles } from "lucide-react";

interface MetricStats {
  bids: number;
  awards: number;
  urgentBids: number;
  saved: number;
}

export function MetricGrid({ stats }: { stats: MetricStats }) {
  const metrics = [
    { label: "입찰공고", value: stats.bids, icon: FileSearch, tone: "text-[#1f6f5b]" },
    { label: "낙찰결과", value: stats.awards, icon: Database, tone: "text-[#2563eb]" },
    { label: "7일 내", value: stats.urgentBids, icon: Sparkles, tone: "text-[#9a5b16]" },
    { label: "저장", value: stats.saved, icon: BookmarkCheck, tone: "text-[#8f3d46]" }
  ];

  return (
    <section className="grid grid-cols-2 gap-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#697783]">{metric.label}</span>
              <Icon className={`h-4 w-4 ${metric.tone}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold">{metric.value.toLocaleString("ko-KR")}</div>
          </div>
        );
      })}
    </section>
  );
}
