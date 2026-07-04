import { ChecklistKey, OpportunityStatus, ReviewChecklist, SavedOpportunity } from "@/lib/types";

export const savedStatusLabel: Record<OpportunityStatus, string> = {
  new: "검토 전",
  interested: "관심",
  "contact-planned": "문의 예정",
  excluded: "제외"
};

export const savedStatusOptions: OpportunityStatus[] = ["new", "interested", "contact-planned", "excluded"];

export const checklistLabels: Record<ChecklistKey, string> = {
  sourceChecked: "원문 확인",
  attachmentChecked: "첨부 확인",
  qualificationChecked: "자격 확인",
  amountReviewed: "금액 검토",
  buyerContacted: "담당자 문의",
  scheduleChecked: "제출 일정 확인"
};

export const checklistKeys = Object.keys(checklistLabels) as ChecklistKey[];

export function createEmptyChecklist(): ReviewChecklist {
  return checklistKeys.reduce(
    (checklist, key) => ({
      ...checklist,
      [key]: false
    }),
    {} as ReviewChecklist
  );
}

export function normalizeChecklist(value?: Partial<ReviewChecklist>): ReviewChecklist {
  return {
    ...createEmptyChecklist(),
    ...(value || {})
  };
}

export function buildSavedStatusCounts(saved: SavedOpportunity[]): Record<OpportunityStatus, number> {
  return savedStatusOptions.reduce(
    (counts, status) => ({
      ...counts,
      [status]: saved.filter((item) => item.status === status).length
    }),
    {
      new: 0,
      interested: 0,
      "contact-planned": 0,
      excluded: 0
    } as Record<OpportunityStatus, number>
  );
}

export function normalizeSavedDate(value?: string): string | undefined {
  if (!value) return undefined;
  const compact = value.replace(/[^\d]/g, "");
  if (compact.length >= 8) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}
