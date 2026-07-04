import { OpportunityRecordKind, SourceCategory } from "@/lib/types";
import { savedStatusLabel } from "@/lib/review";

export const categoryLabel: Record<SourceCategory, string> = {
  public: "공공/국가",
  "power-gas-facility": "전력·가스·설비",
  "construction-civil": "건설·토목·공사",
  "enterprise-public": "대기업 공개"
};

export const categoryOptions: SourceCategory[] = [
  "public",
  "power-gas-facility",
  "construction-civil",
  "enterprise-public"
];

export const recordKindLabel: Record<OpportunityRecordKind, string> = {
  bid: "입찰공고",
  award: "낙찰결과"
};

export const workTypeOptions = ["물품", "공사", "용역", "외자", "협력사 모집"];

export { savedStatusLabel };
