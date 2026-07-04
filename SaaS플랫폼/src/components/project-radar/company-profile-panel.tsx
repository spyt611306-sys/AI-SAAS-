"use client";

import { Building2, Loader2, Save } from "lucide-react";
import { Field, TagInput } from "@/components/project-radar/shared";
import { CompanyProfile } from "@/lib/types";

export function CompanyProfilePanel({
  profile,
  onChange,
  onSave,
  isSaving
}: {
  profile: CompanyProfile;
  onChange: (profile: CompanyProfile) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Company Profile</h2>
        <Building2 className="h-4 w-4 text-[#1f6f5b]" />
      </div>
      <div className="space-y-3">
        <Field label="회사명">
          <input
            value={profile.name}
            onChange={(event) => onChange({ ...profile, name: event.target.value })}
            className="h-9 w-full rounded-md border border-line px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
          />
        </Field>
        <Field label="취급 품목">
          <TagInput value={profile.suppliedItems} onChange={(suppliedItems) => onChange({ ...profile, suppliedItems })} />
        </Field>
        <Field label="보유 인증">
          <TagInput value={profile.certifications} onChange={(certifications) => onChange({ ...profile, certifications })} />
        </Field>
        <Field label="납품 실적">
          <TagInput value={profile.pastPerformances} onChange={(pastPerformances) => onChange({ ...profile, pastPerformances })} />
        </Field>
        <Field label="보유 장비">
          <TagInput value={profile.equipment} onChange={(equipment) => onChange({ ...profile, equipment })} />
        </Field>
        <Field label="인력/기술">
          <TagInput value={profile.personnel} onChange={(personnel) => onChange({ ...profile, personnel })} />
        </Field>
        <Field label="타깃 발주처">
          <TagInput value={profile.targetBuyers} onChange={(targetBuyers) => onChange({ ...profile, targetBuyers })} />
        </Field>
        <Field label="협력사 등록 기관">
          <TagInput value={profile.partnerBuyers} onChange={(partnerBuyers) => onChange({ ...profile, partnerBuyers })} />
        </Field>
        <Field label="타깃 지역">
          <TagInput value={profile.targetRegions} onChange={(targetRegions) => onChange({ ...profile, targetRegions })} />
        </Field>
        <Field label="제외 키워드">
          <TagInput value={profile.excludedKeywords} onChange={(excludedKeywords) => onChange({ ...profile, excludedKeywords })} />
        </Field>
        <Field label="불가능 조건">
          <TagInput value={profile.unavailableConditions} onChange={(unavailableConditions) => onChange({ ...profile, unavailableConditions })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="최소 금액">
            <input
              type="number"
              value={profile.minAmount || ""}
              onChange={(event) => onChange({ ...profile, minAmount: Number(event.target.value) || undefined })}
              className="h-9 w-full rounded-md border border-line px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
            />
          </Field>
          <Field label="최대 금액">
            <input
              type="number"
              value={profile.maxAmount || ""}
              onChange={(event) => onChange({ ...profile, maxAmount: Number(event.target.value) || undefined })}
              className="h-9 w-full rounded-md border border-line px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </button>
      </div>
    </section>
  );
}
