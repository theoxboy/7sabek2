import { Button } from "@/components/ui/Button";

type AdvisorBlockedStateProps = {
  blockingIssues: string[];
  missingRequiredFields: string[];
  onRetry: () => void;
};

export function AdvisorBlockedState({ blockingIssues, missingRequiredFields, onRetry }: AdvisorBlockedStateProps) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-lg font-semibold text-rose-800">Preview bloqué</h2>
      <p className="mt-2 text-sm text-rose-700">Certaines données sont manquantes ou incohérentes.</p>

      {blockingIssues.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-rose-800">
          {blockingIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}

      {missingRequiredFields.length ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-rose-700">
          {missingRequiredFields.map((fieldName) => (
            <li key={fieldName}>{fieldName}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5">
        <Button onClick={onRetry}>Réessayer</Button>
      </div>
    </div>
  );
}
