type AdvisorWarningBannerProps = {
  warnings: string[];
};

export function AdvisorWarningBanner({ warnings }: AdvisorWarningBannerProps) {
  if (!warnings.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
      <p className="font-semibold">Points d’attention</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
