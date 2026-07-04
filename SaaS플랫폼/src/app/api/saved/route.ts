import { NextResponse } from "next/server";
import { getAppState, removeSavedOpportunity, saveOpportunity } from "@/lib/db";
import { normalizeChecklist, normalizeSavedDate } from "@/lib/review";
import { OpportunityStatus, ReviewChecklist } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveRequest {
  opportunityId: string;
  status?: OpportunityStatus;
  note?: string;
  nextActionDate?: string;
  ownerNote?: string;
  excludeReason?: string;
  checklist?: Partial<ReviewChecklist>;
  remove?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SaveRequest;

  if (!body.opportunityId) {
    return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
  }

  if (body.remove) {
    removeSavedOpportunity(body.opportunityId);
  } else {
    const currentSaved = getAppState().saved.find((saved) => saved.opportunityId === body.opportunityId);
    saveOpportunity({
      opportunityId: body.opportunityId,
      status: body.status || currentSaved?.status || "interested",
      note: body.note ?? currentSaved?.note ?? "",
      nextActionDate: normalizeSavedDate(body.nextActionDate) ?? currentSaved?.nextActionDate,
      ownerNote: body.ownerNote ?? currentSaved?.ownerNote ?? "",
      excludeReason: body.excludeReason ?? currentSaved?.excludeReason ?? "",
      checklist: normalizeChecklist({
        ...(currentSaved?.checklist || {}),
        ...(body.checklist || {})
      }),
      savedAt: currentSaved?.savedAt || new Date().toISOString()
    });
  }

  return NextResponse.json(getAppState());
}
