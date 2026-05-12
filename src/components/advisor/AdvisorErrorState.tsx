import { Button } from "@/components/ui/Button";

type AdvisorErrorStateProps = {
  message?: string | null;
  onRetry: () => void;
};

export function AdvisorErrorState({ message, onRetry }: AdvisorErrorStateProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold text-slate-900">Erreur serveur</h2>
      <p className="mt-2 text-sm text-slate-600">Impossible de charger le preview Advisor pour le moment.</p>
      {message ? <p className="mt-2 text-xs text-slate-500">{message}</p> : null}
      <div className="mt-5">
        <Button onClick={onRetry}>Réessayer</Button>
      </div>
    </div>
  );
}
