import type { ProposalV1 } from "@/types/advisor";

import { AdvisorDegradedBadge } from "@/components/advisor/AdvisorDegradedBadge";

type AdvisorProposalCardProps = {
  proposal: ProposalV1;
  isRecommended: boolean;
  degradedMode: boolean;
};

export function AdvisorProposalCard({ proposal, isRecommended, degradedMode }: AdvisorProposalCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{proposal.title_key || proposal.proposal_type}</h3>
          <p className="text-sm text-slate-600">{proposal.subtitle_key || proposal.proposal_type}</p>
        </div>
        <div className="flex items-center gap-2">
          {degradedMode ? <AdvisorDegradedBadge /> : null}
          {isRecommended ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Recommandé</span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-2">Priorité: {proposal.recommendation_layer.main_priority}</div>
        <div className="rounded-lg bg-slate-50 p-2">Risque: {proposal.risk_signals.risk_level}</div>
        <div className="rounded-lg bg-slate-50 p-2">Reserve: {Math.round(proposal.allocation.monthly.reserve)}</div>
        <div className="rounded-lg bg-slate-50 p-2">Objectifs: {Math.round(proposal.allocation.monthly.goals)}</div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p>Tradeoff: {proposal.tradeoffs.tradeoff_tags.join(", ") || "—"}</p>
        {proposal.recommendation_layer.recommended_for_tags.length ? (
          <div className="flex flex-wrap gap-2">
            {proposal.recommendation_layer.recommended_for_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
