import { NextResponse } from "next/server";
import { getAppState, updateProfile } from "@/lib/db";
import { normalizeCompanyProfile } from "@/lib/profile";
import { CompanyProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as CompanyProfile;
  updateProfile(normalizeCompanyProfile(body));
  return NextResponse.json(getAppState());
}
