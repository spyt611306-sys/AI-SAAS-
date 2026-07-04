import { NextResponse } from "next/server";
import { getAppState } from "@/lib/db";
import { collectAllSources } from "@/lib/sources/collect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const results = await collectAllSources();
  return NextResponse.json({
    results,
    state: getAppState()
  });
}
