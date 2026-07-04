"use client";

import { ClipboardList } from "lucide-react";
import { DetailLine, EmptyPanel } from "@/components/project-radar/shared";
import { formatAmount, getPrimaryDateLabel } from "@/components/project-radar/utils";
import { checklistKeys, checklistLabels, normalizeChecklist, savedStatusLabel } from "@/lib/review";
import { LinkedAwardSummary, MatchResult, Opportunity, SavedOpportunity } from "@/lib/types";

export function ReviewReport({
  opportunity,
  match,
  saved,
  linkedAwards
}: {
  opportunity: Opportunity;
  match?: MatchResult;
  saved?: SavedOpportunity;
  linkedAwards: LinkedAwardSummary[];
}) {
  const positiveReasons = (match?.reasons || []).slice(0, 3);
  const negativeReasons = (match?.penalties || []).slice(0, 3);
  const checklist = normalizeChecklist(saved?.checklist);
  const checkedItems = checklistKeys.filter((key) => checklist[key]).map((key) => checklistLabels[key]);

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-[#1f6f5b]" />
        <h3 className="text-sm font-semibold">검토 리포트</h3>
      </div>
      <div className="grid gap-3 rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3 text-sm">
        <DetailLine label="검토 상태" value={saved ? savedStatusLabel[saved.status] : "미저장"} />
        <DetailLine label="추천 점수" value={`${match?.score || 0}점`} />
        <DetailLine label="발주처" value={opportunity.buyer || "미공개"} />
        <DetailLine label="금액" value={opportunity.amount ? formatAmount(opportunity.amount) : opportunity.amountLabel} />
        <DetailLine label="마감/일자" value={getPrimaryDateLabel(opportunity)} />
        <DetailLine label="원문" value={opportunity.originalUrl || "미공개"} />
        <div>
          <div className="mb-1 font-semibold text-[#25313b]">추천 이유</div>
          {positiveReasons.length ? (
            <ul className="space-y-1 text-[#5d6a75]">
              {positiveReasons.map((reason) => (
                <li key={`${reason.label}-${reason.detail}`}>{reason.label}: {reason.detail}</li>
              ))}
            </ul>
          ) : (
            <EmptyPanel>추천 이유가 아직 없습니다.</EmptyPanel>
          )}
        </div>
        <div>
          <div className="mb-1 font-semibold text-[#25313b]">감점 이유</div>
          {negativeReasons.length ? (
            <ul className="space-y-1 text-[#5d6a75]">
              {negativeReasons.map((reason) => (
                <li key={`${reason.label}-${reason.detail}`}>{reason.label}: {reason.detail}</li>
              ))}
            </ul>
          ) : (
            <div className="text-[#697783]">큰 감점 사유 없음</div>
          )}
        </div>
        <div>
          <div className="mb-1 font-semibold text-[#25313b]">낙찰 참고</div>
          {linkedAwards.length ? (
            <ul className="space-y-1 text-[#5d6a75]">
              {linkedAwards.map((award) => (
                <li key={award.opportunityId}>
                  {award.winnerName || "낙찰업체 미공개"} / {award.awardAmount ? formatAmount(award.awardAmount) : "금액 미공개"} / {award.awardRate || "낙찰률 미공개"}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-[#697783]">연결된 낙찰 결과 없음</div>
          )}
        </div>
        <div>
          <div className="mb-1 font-semibold text-[#25313b]">검토 메모</div>
          <div className="text-[#5d6a75]">{saved?.note || saved?.ownerNote || "메모 없음"}</div>
        </div>
        <div>
          <div className="mb-1 font-semibold text-[#25313b]">체크 완료</div>
          <div className="text-[#5d6a75]">{checkedItems.length ? checkedItems.join(", ") : "체크 전"}</div>
        </div>
      </div>
    </section>
  );
}
