import { CompanyProfile } from "@/lib/types";

export function normalizeCompanyProfile(profile: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    name: profile.name || "Demo Industrial Sales Team",
    targetCategories: profile.targetCategories || [],
    targetBuyers: profile.targetBuyers || [],
    targetRegions: profile.targetRegions || [],
    suppliedItems: profile.suppliedItems || [],
    excludedKeywords: profile.excludedKeywords || [],
    certifications: profile.certifications || [],
    pastPerformances: profile.pastPerformances || [],
    equipment: profile.equipment || [],
    personnel: profile.personnel || [],
    partnerBuyers: profile.partnerBuyers || [],
    unavailableConditions: profile.unavailableConditions || [],
    minAmount: profile.minAmount || undefined,
    maxAmount: profile.maxAmount || undefined
  };
}
