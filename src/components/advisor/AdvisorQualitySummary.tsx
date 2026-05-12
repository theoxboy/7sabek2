type AdvisorQualitySummaryProps = {
  completenessScore: number;
  reliabilityScore: number;
  degradedMode: boolean;
};

export function AdvisorQualitySummary({
  completenessScore,
  reliabilityScore,
  degradedMode,
}: AdvisorQualitySummaryProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          Complétude: {Math.round(completenessScore)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
          Fiabilité: {Math.round(reliabilityScore)}
        </span>
        {degradedMode ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">Mode dégradé</span>
        ) : null}
      </div>
    </div>
  );
}
