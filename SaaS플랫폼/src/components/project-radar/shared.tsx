"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Gauge,
  LucideIcon
} from "lucide-react";
import { ReactNode } from "react";
import { DataQualityReport, EvidenceItem, Source } from "@/lib/types";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#697783]">{label}</span>
      {children}
    </label>
  );
}

export function TagInput({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return (
    <input
      value={value.join(", ")}
      onChange={(event) =>
        onChange(
          event.target.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      }
      className="h-9 w-full rounded-md border border-line px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
    />
  );
}

export function ScoreGauge({ score, label }: { score: number; label: string }) {
  return (
    <div className="w-16 text-right">
      <div className={`text-lg font-semibold ${score >= 80 ? "text-[#1f6f5b]" : score >= 55 ? "text-[#80531c]" : "text-[#8f3d46]"}`}>
        {score}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7b8894]">{label}</div>
    </div>
  );
}

export function ScoreBox({ label, score, icon: Icon }: { label: string; score: number; icon: typeof Gauge }) {
  const width = Math.max(0, Math.min(100, score));
  return (
    <div className="rounded-md border border-[#e7ecf1] p-3">
      <div className="flex items-center justify-between text-xs font-semibold text-[#697783]">
        {label}
        <Icon className="h-4 w-4 text-[#1f6f5b]" />
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-semibold">{score}</span>
        <span className="pb-1 text-sm text-[#697783]">/100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-[#e8edf2]">
        <div className="h-full bg-[#1f6f5b]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function EvidenceLine({ item }: { item: EvidenceItem }) {
  const positive = item.impact === "positive";
  const neutral = item.impact === "neutral";
  return (
    <div className="flex gap-2 rounded-md border border-[#e7ecf1] p-3">
      {positive || neutral ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1f6f5b]" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9a4242]" />
      )}
      <div>
        <div className="text-sm font-semibold">
          {item.label} <span className={positive || neutral ? "text-[#1f6f5b]" : "text-[#9a4242]"}>{item.points > 0 ? `+${item.points}` : item.points}</span>
        </div>
        <div className="mt-1 text-sm leading-5 text-[#5d6a75]">{item.detail}</div>
      </div>
    </div>
  );
}

export function Meta({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#7b8894]" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: Source["status"] }) {
  const label = {
    ready: "대기",
    "needs-api-key": "추가 설정",
    ok: "정상",
    partial: "부분",
    failed: "실패"
  }[status];
  const tone = {
    ready: "bg-[#eef2f5] text-[#43505b]",
    "needs-api-key": "bg-[#fff4df] text-[#80531c]",
    ok: "bg-[#e6f2ee] text-[#1f6f5b]",
    partial: "bg-[#f3eadf] text-[#80531c]",
    failed: "bg-[#fae8e8] text-[#9a4242]"
  }[status];
  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

export function QualityBadge({ quality }: { quality: DataQualityReport }) {
  const tone = {
    ok: "bg-[#e6f2ee] text-[#1f6f5b]",
    "needs-review": "bg-[#fff4df] text-[#80531c]",
    insufficient: "bg-[#fae8e8] text-[#9a4242]",
    expired: "bg-[#eef2f5] text-[#43505b]"
  }[quality.status];

  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      {quality.label} {quality.completedFields}/{quality.totalFields}
    </span>
  );
}

export function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3">
      <span className="text-[#697783]">{label}</span>
      <span className="font-medium text-[#25313b]">{value}</span>
    </div>
  );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-line p-3 text-sm text-[#697783]">{children}</div>;
}
