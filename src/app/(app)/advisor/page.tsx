"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchMe } from "@/lib/auth";
import { usePlatformStatus } from "@/lib/usePlatformStatus";
import { AdvisorBlockedState } from "@/components/advisor/AdvisorBlockedState";
import { AdvisorErrorState } from "@/components/advisor/AdvisorErrorState";
import { AdvisorHeader } from "@/components/advisor/AdvisorHeader";
import { AdvisorProposalList } from "@/components/advisor/AdvisorProposalList";
import { AdvisorQualitySummary } from "@/components/advisor/AdvisorQualitySummary";
import { AdvisorWarningBanner } from "@/components/advisor/AdvisorWarningBanner";
import { useAdvisorMachine } from "@/state/advisorMachine";

export default function AdvisorPage() {
  const router = useRouter();
  const status = usePlatformStatus();
  const [userId, setUserId] = useState<string | null>(null);
  const { context, loadPreview } = useAdvisorMachine(userId);

  useEffect(() => {
    if (status?.advisor_tab_enabled === false) {
      router.replace("/dashboard");
    }
  }, [router, status?.advisor_tab_enabled]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const me = await fetchMe();
        if (!active) return;
        setUserId(me.id);
      } catch {
        if (!active) return;
        setUserId(null);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (userId) {
      void loadPreview(false);
    }
  }, [userId, loadPreview]);

  const content = useMemo(() => {
    if (context.state === "loading_preview" || context.state === "idle_init") {
      return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">Chargement du preview Advisor...</div>;
    }

    if (context.state === "server_error") {
      return <AdvisorErrorState message={context.lastError?.message} onRetry={() => void loadPreview(true)} />;
    }

    if (context.state === "preview_blocked" && context.preview) {
      return (
        <AdvisorBlockedState
          blockingIssues={context.preview.blocking_issues}
          missingRequiredFields={context.preview.missing_required_fields}
          onRetry={() => void loadPreview(true)}
        />
      );
    }

    if (context.state === "preview_ready" && context.preview) {
      return (
        <div className="space-y-4">
          <AdvisorQualitySummary
            completenessScore={context.preview.data_quality_summary.completeness_score}
            reliabilityScore={context.preview.data_quality_summary.reliability_score}
            degradedMode={context.preview.degraded_mode}
          />
          <AdvisorWarningBanner warnings={context.preview.warnings} />
          <AdvisorProposalList
            proposals={context.preview.proposals}
            recommendedProposalId={context.preview.recommended_proposal_id}
            degradedMode={context.preview.degraded_mode}
          />
        </div>
      );
    }

    return <AdvisorErrorState onRetry={() => void loadPreview(true)} message="État inattendu." />;
  }, [context, loadPreview]);

  return (
    <main className="space-y-6">
      <AdvisorHeader onReload={() => void loadPreview(true)} isLoading={context.isLoadingPreview} />
      {content}
    </main>
  );
}
