"use client";

import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Gauge,
  MapPin,
  Save,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChecklistPanel } from "@/components/project-radar/checklist-panel";
import { categoryLabel, recordKindLabel, savedStatusLabel } from "@/components/project-radar/constants";
import { ReviewReport } from "@/components/project-radar/review-report";
import { SavedUpdate } from "@/components/project-radar/review-workspace";
import { DetailLine, EmptyPanel, EvidenceLine, Meta, QualityBadge, ScoreBox } from "@/components/project-radar/shared";
import { formatAmount, formatNoticeNumber, getPrimaryDateLabel, getReadableSummary, getRecordKind } from "@/components/project-radar/utils";
import { buildAgencyAwardInsight, findLinkedAwards } from "@/lib/award-links";
import { evaluateOpportunityQuality } from "@/lib/opportunity-quality";
import { savedStatusOptions } from "@/lib/review";
import { AgencyAwardInsight, LinkedAwardSummary, MatchResult, Opportunity, OpportunityStatus, SavedOpportunity } from "@/lib/types";

export function OpportunityDetail({
  opportunity,
  opportunities,
  match,
  saved,
  onToggleSaved,
  onUpdateSaved
}: {
  opportunity?: Opportunity;
  opportunities: Opportunity[];
  match?: MatchResult;
  saved?: SavedOpportunity;
  onToggleSaved: (opportunity: Opportunity) => void;
  onUpdateSaved: (opportunityId: string, next: SavedUpdate) => Promise<void>;
}) {
  if (!opportunity) {
    return (
      <aside className="rounded-lg border border-line bg-white p-4 shadow-soft">
        <div className="text-sm text-[#697783]">프로젝트 없음</div>
      </aside>
    );
  }

  const quality = evaluateOpportunityQuality(opportunity);
  const linkedAwards = findLinkedAwards(opportunity, opportunities);
  const agencyInsight = buildAgencyAwardInsight(opportunity, opportunities);

  return (
    <aside className="rounded-lg border border-line bg-white shadow-soft">
      <div className="border-b border-line p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  getRecordKind(opportunity) === "bid" ? "bg-[#e6f2ee] text-[#1f6f5b]" : "bg-[#eef2f5] text-[#43505b]"
                }`}
              >
                {recordKindLabel[getRecordKind(opportunity)]}
              </span>
              <span className="rounded-md bg-[#e6f2ee] px-2 py-1 text-xs font-semibold text-[#1f6f5b]">
                {categoryLabel[opportunity.category]}
              </span>
              <span className="rounded-md bg-[#eef2f5] px-2 py-1 text-xs font-semibold text-[#43505b]">
                {opportunity.workType}
              </span>
              <QualityBadge quality={quality} />
            </div>
            <h2 className="text-lg font-semibold leading-snug">{opportunity.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => onToggleSaved(opportunity)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-white"
            aria-label={saved ? "저장 해제" : "관심 저장"}
          >
            {saved ? <BookmarkCheck className="h-4 w-4 text-[#8f3d46]" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-210px)] overflow-auto p-4 scrollbar-thin">
        <div className="grid grid-cols-2 gap-3">
          <ScoreBox label="매칭" score={match?.score || 0} icon={Gauge} />
          <ScoreBox label="품질" score={quality.score} icon={ShieldCheck} />
        </div>

        <ReviewWorkspacePanel opportunity={opportunity} saved={saved} onUpdateSaved={onUpdateSaved} />
        <ChecklistPanel opportunity={opportunity} saved={saved} onUpdateSaved={onUpdateSaved} />

        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">요약</h3>
          <p className="rounded-md border border-[#e7ecf1] bg-panel p-3 text-sm leading-6 text-[#43505b]">
            {getReadableSummary(opportunity)}
          </p>
        </section>

        <QualityPanel quality={quality} />

        {getRecordKind(opportunity) === "bid" ? <BidCorePanel opportunity={opportunity} /> : null}

        <ScoreBreakdownPanel match={match} />

        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">추천 근거</h3>
          <div className="space-y-2">
            {match?.reasons.length || match?.penalties.length ? (
              <>
                {(match?.reasons || []).map((reason) => (
                  <EvidenceLine key={`${reason.label}-${reason.detail}`} item={reason} />
                ))}
                {(match?.penalties || []).map((penalty) => (
                  <EvidenceLine key={`${penalty.label}-${penalty.detail}`} item={penalty} />
                ))}
              </>
            ) : (
              <EmptyPanel>회사 프로필을 입력하면 추천 근거가 더 선명해집니다.</EmptyPanel>
            )}
          </div>
        </section>

        <ReviewReport opportunity={opportunity} match={match} saved={saved} linkedAwards={linkedAwards} />

        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">요구 품목</h3>
          <div className="flex flex-wrap gap-2">
            {opportunity.requiredItems.length ? (
              opportunity.requiredItems.map((item) => (
                <span key={item} className="rounded-md border border-[#d5e5df] bg-[#f5fbf8] px-2 py-1 text-xs font-semibold text-[#1f6f5b]">
                  {item}
                </span>
              ))
            ) : (
              <span className="rounded-md border border-line px-2 py-1 text-xs text-[#697783]">품목 미확인</span>
            )}
          </div>
        </section>

        <LinkedAwardPanel awards={linkedAwards} />
        <AgencyAwardInsightPanel insight={agencyInsight} />
        <SourceAttachmentPanel opportunity={opportunity} />

        {getRecordKind(opportunity) === "award" ? <AwardDetailsPanel opportunity={opportunity} /> : null}

        {opportunity.riskFlags.length ? (
          <section className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">주의 사항</h3>
            <div className="space-y-2">
              {opportunity.riskFlags.map((risk) => (
                <div key={risk} className="flex gap-2 rounded-md border border-[#f0d4d4] bg-[#fff7f7] p-3 text-sm text-[#8f3d46]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function ReviewWorkspacePanel({
  opportunity,
  saved,
  onUpdateSaved
}: {
  opportunity: Opportunity;
  saved?: SavedOpportunity;
  onUpdateSaved: (opportunityId: string, next: SavedUpdate) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    note: saved?.note || "",
    nextActionDate: saved?.nextActionDate || "",
    ownerNote: saved?.ownerNote || "",
    excludeReason: saved?.excludeReason || ""
  });

  useEffect(() => {
    setDraft({
      note: saved?.note || "",
      nextActionDate: saved?.nextActionDate || "",
      ownerNote: saved?.ownerNote || "",
      excludeReason: saved?.excludeReason || ""
    });
  }, [saved?.note, saved?.nextActionDate, saved?.ownerNote, saved?.excludeReason, saved?.opportunityId]);

  if (!saved) {
    return (
      <section className="mt-4 rounded-md border border-dashed border-line p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">검토 상태</h3>
            <p className="mt-1 text-sm text-[#697783]">관심 건으로 저장하면 상태와 메모를 남길 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={() => void onUpdateSaved(opportunity.id, { status: "new", note: "" })}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#1f6f5b] px-3 text-sm font-semibold text-white"
          >
            <BookmarkCheck className="h-4 w-4" />
            저장
          </button>
        </div>
      </section>
    );
  }

  const currentSaved = saved;

  function save(nextStatus = currentSaved.status) {
    void onUpdateSaved(opportunity.id, {
      status: nextStatus,
      note: draft.note,
      nextActionDate: draft.nextActionDate,
      ownerNote: draft.ownerNote,
      excludeReason: draft.excludeReason
    });
  }

  return (
    <section className="mt-4 rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">검토 상태</h3>
        <button
          type="button"
          onClick={() => void onUpdateSaved(opportunity.id, { remove: true })}
          className="h-8 rounded-md border border-line px-3 text-xs font-semibold text-[#8f3d46] hover:border-[#8f3d46]"
        >
          저장 해제
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <select
          value={saved.status}
          onChange={(event) => save(event.target.value as OpportunityStatus)}
          className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
        >
          {savedStatusOptions.map((status) => (
            <option key={status} value={status}>
              {savedStatusLabel[status]}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={draft.nextActionDate}
          onChange={(event) => setDraft((current) => ({ ...current, nextActionDate: event.target.value }))}
          className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
        />
        <textarea
          value={draft.note}
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          placeholder="문의 포인트, 확인할 담당자, 제외 사유 등을 적어두세요"
          className="min-h-20 resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 outline-none ring-[#1f6f5b]/20 focus:ring-4"
        />
        <input
          value={draft.ownerNote}
          onChange={(event) => setDraft((current) => ({ ...current, ownerNote: event.target.value }))}
          placeholder="담당자 메모"
          className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
        />
        <input
          value={draft.excludeReason}
          onChange={(event) => setDraft((current) => ({ ...current, excludeReason: event.target.value }))}
          placeholder="제외 사유"
          className="h-9 rounded-md border border-line bg-white px-3 text-sm outline-none ring-[#1f6f5b]/20 focus:ring-4"
        />
        <button
          type="button"
          onClick={() => save()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-[#1f6f5b] hover:border-[#1f6f5b]"
        >
          <Save className="h-4 w-4" />
          검토 정보 저장
        </button>
      </div>
    </section>
  );
}

function QualityPanel({ quality }: { quality: ReturnType<typeof evaluateOpportunityQuality> }) {
  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">데이터 품질</h3>
      <div className="rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold">{quality.label}</span>
          <span className="text-[#697783]">{quality.score}점</span>
        </div>
        <div className="grid gap-2 text-sm">
          {quality.checks.map((check) => (
            <div key={check.key} className="flex items-start justify-between gap-3">
              <span className="font-medium text-[#25313b]">{check.label}</span>
              <span className={check.status === "present" ? "text-[#1f6f5b]" : check.status === "warning" ? "text-[#80531c]" : "text-[#9a4242]"}>
                {check.status === "present" ? "확인" : check.status === "warning" ? "확인 필요" : "누락"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BidCorePanel({ opportunity }: { opportunity: Opportunity }) {
  const notice = opportunity.notice;

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">입찰 핵심정보</h3>
      <div className="grid gap-2 rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3 text-sm">
        <DetailLine label="공고번호" value={formatNoticeNumber(notice)} />
        <DetailLine label="공고기관" value={notice?.noticeAgency || opportunity.buyer || "미공개"} />
        <DetailLine label="수요기관" value={notice?.demandAgency || "미공개"} />
        <DetailLine label="추정가격" value={formatAmount(notice?.estimatedPrice || opportunity.amount)} />
        <DetailLine label="예산금액" value={formatAmount(notice?.budgetAmount)} />
        <DetailLine label="입찰마감" value={notice?.bidCloseAt || opportunity.deadline || "미공개"} />
        <DetailLine label="개찰일" value={notice?.openAt || "미공개"} />
        <DetailLine label="계약/입찰" value={[notice?.contractMethod, notice?.bidMethod].filter(Boolean).join(" / ") || "미공개"} />
      </div>
    </section>
  );
}

function ScoreBreakdownPanel({ match }: { match?: MatchResult }) {
  const items = [
    ["품목", match?.breakdown.item || 0],
    ["기관", match?.breakdown.agency || 0],
    ["금액", match?.breakdown.amount || 0],
    ["일정", match?.breakdown.timeline || 0],
    ["출처", match?.breakdown.source || 0],
    ["품질", match?.breakdown.quality || 0],
    ["역량", match?.breakdown.capability || 0]
  ];

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">세부 점수</h3>
      <div className="grid grid-cols-3 gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md border border-[#e7ecf1] p-2">
            <div className="text-[11px] font-semibold text-[#697783]">{label}</div>
            <div className={`mt-1 text-lg font-semibold ${Number(value) < 0 ? "text-[#9a4242]" : "text-[#1f6f5b]"}`}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LinkedAwardPanel({ awards }: { awards: LinkedAwardSummary[] }) {
  if (!awards.length) return null;

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">연결된 낙찰결과</h3>
      <div className="space-y-2">
        {awards.map((award) => (
          <div key={award.opportunityId} className="rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3 text-sm">
            <DetailLine label="낙찰업체" value={award.winnerName || "미공개"} />
            <DetailLine label="낙찰금액" value={award.awardAmount ? formatAmount(award.awardAmount) : "미공개"} />
            <DetailLine label="낙찰률" value={award.awardRate ? `${award.awardRate}%` : "미공개"} />
            <DetailLine label="최종일" value={award.awardedAt || award.openedAt || "미공개"} />
          </div>
        ))}
      </div>
    </section>
  );
}

function AgencyAwardInsightPanel({ insight }: { insight?: AgencyAwardInsight }) {
  if (!insight) return null;

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">기관별 낙찰 참고</h3>
      <div className="rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3 text-sm">
        <DetailLine label="기관" value={insight.agencyName} />
        <DetailLine label="참고 건수" value={`${insight.awardCount.toLocaleString("ko-KR")}건`} />
        <DetailLine label="평균률" value={insight.averageAwardRate ? `${insight.averageAwardRate}%` : "미공개"} />
        <div className="mt-2 text-[#697783]">
          반복 낙찰업체:{" "}
          {insight.repeatedWinners.length
            ? insight.repeatedWinners.map((item) => `${item.winnerName} ${item.count}건`).join(", ")
            : "아직 반복 패턴 없음"}
        </div>
      </div>
    </section>
  );
}

function SourceAttachmentPanel({ opportunity }: { opportunity: Opportunity }) {
  const attachments = opportunity.notice?.attachmentUrls || [];

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">원문/첨부</h3>
      <div className="rounded-md border border-[#e7ecf1] p-3 text-sm">
        <div className="font-semibold">{opportunity.sourceName}</div>
        <div className="mt-2 grid gap-2 text-[#5d6a75]">
          <Meta icon={Building2} label={opportunity.buyer} />
          <Meta icon={MapPin} label={opportunity.region} />
          <Meta icon={CircleDollarSign} label={opportunity.amountLabel} />
          <Meta icon={CalendarDays} label={getPrimaryDateLabel(opportunity)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={opportunity.originalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-[#1f6f5b]"
          >
            원문 열기 <ExternalLink className="h-4 w-4" />
          </a>
          {attachments.map((url, index) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-[#43505b]"
            >
              첨부 {index + 1} <ExternalLink className="h-4 w-4" />
            </a>
          ))}
          {attachments.length === 0 ? (
            <span className="inline-flex h-9 items-center rounded-md border border-dashed border-line px-3 text-sm text-[#697783]">
              첨부 링크 없음
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AwardDetailsPanel({ opportunity }: { opportunity: Opportunity }) {
  const award = opportunity.award;

  return (
    <section className="mt-4">
      <h3 className="mb-2 text-sm font-semibold">낙찰 참고정보</h3>
      <div className="grid gap-2 rounded-md border border-[#e7ecf1] bg-[#fbfcfd] p-3 text-sm">
        <DetailLine label="낙찰업체" value={award?.winnerName || "미공개"} />
        <DetailLine label="낙찰금액" value={award?.awardAmount ? formatAmount(award.awardAmount) : opportunity.amountLabel} />
        <DetailLine label="낙찰률" value={award?.awardRate ? `${award.awardRate}%` : "미공개"} />
        <DetailLine label="참가업체수" value={award?.participantCount ? `${award.participantCount.toLocaleString("ko-KR")}개사` : "미공개"} />
        <DetailLine label="개찰일" value={award?.openedAt || "미공개"} />
        <DetailLine label="최종낙찰일" value={award?.awardedAt || "미공개"} />
      </div>
    </section>
  );
}
