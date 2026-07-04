"use client";

import { Download } from "lucide-react";

export function ExportActions() {
  return (
    <a
      href="/api/export/saved.csv"
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-[#1f6f5b] hover:border-[#1f6f5b]"
    >
      <Download className="h-4 w-4" />
      CSV 내보내기
    </a>
  );
}
