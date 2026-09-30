import Image from "next/image";
import { Button } from "@/components/ui/Button";

type AdvisorHeaderProps = {
  onReload: () => void;
  isLoading: boolean;
};

export function AdvisorHeader({ onReload, isLoading }: AdvisorHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm shrink-0">
          <Image
            src="/landing/ai/ba-omar-avatar.png"
            alt="Ba Omar"
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Ba Omar</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Conseiller IA • Recommandations et optimisation budgétaire
          </p>
        </div>
      </div>
      <Button onClick={onReload} disabled={isLoading}>
        {isLoading ? "Chargement..." : "Rafraîchir"}
      </Button>
    </div>
  );
}
