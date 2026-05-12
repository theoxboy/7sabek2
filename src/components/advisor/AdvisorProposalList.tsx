import type { ProposalV1 } from "@/types/advisor";

import { AdvisorProposalCard } from "@/components/advisor/AdvisorProposalCard";

type AdvisorProposalListProps = {
  proposals: ProposalV1[];
  recommendedProposalId?: string | null;
  degradedMode: boolean;
};

export function AdvisorProposalList({ proposals, recommendedProposalId, degradedMode }: AdvisorProposalListProps) {
  return (
    <section className="grid gap-4">
      {proposals.map((proposal) => (
        <AdvisorProposalCard
          key={proposal.proposal_id}
          proposal={proposal}
          isRecommended={proposal.proposal_id === recommendedProposalId}
          degradedMode={degradedMode}
        />
      ))}
    </section>
  );
}
