import { Button } from "@/components/ui/Button";

type AdvisorHeaderProps = {
  onReload: () => void;
  isLoading: boolean;
};

export function AdvisorHeader({ onReload, isLoading }: AdvisorHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Advisor</h1>
        <p className="text-sm text-slate-600">Preview read-only des plans proposés.</p>
      </div>
      <Button onClick={onReload} disabled={isLoading}>
        {isLoading ? "Chargement..." : "Rafraîchir"}
      </Button>
    </div>
  );
}
