"use client";

import { useAppLocale } from "@/lib/appLocale";
import type { FloussyLocale } from "@/lib/localePreference";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

const TRANSACTION_DELETE_COPY: Record<
  FloussyLocale,
  {
    title: string;
    incomeDescription: string;
    expenseDescription: string;
    incomeHint: string;
    expenseHint: string;
    cancel: string;
    delete: string;
  }
> = {
  fr: {
    title: "Supprimer la transaction ?",
    incomeDescription:
      "Cette action supprime la transaction et annule son impact sur Cash ainsi que les redistributions éventuelles.",
    expenseDescription:
      "Cette action supprime la transaction et annule son impact sur l’enveloppe liée.",
    incomeHint:
      "Ex: supprimer un revenu retire l’argent de Cash et des enveloppes alimentées.",
    expenseHint: "Ex: supprimer une dépense recrédite l’enveloppe associée.",
    cancel: "Annuler",
    delete: "Supprimer",
  },
  en: {
    title: "Delete this transaction?",
    incomeDescription:
      "This action deletes the transaction and cancels its impact on Cash as well as any related redistributions.",
    expenseDescription:
      "This action deletes the transaction and cancels its impact on the linked envelope.",
    incomeHint:
      "Example: deleting income removes money from Cash and any funded envelopes.",
    expenseHint:
      "Example: deleting an expense credits the linked envelope back.",
    cancel: "Cancel",
    delete: "Delete",
  },
  ar: {
    title: "واش بغيتي تمسح هاد العملية؟",
    incomeDescription:
      "هاد العملية غادي تتمسح ويتلغى الأثر ديالها على لكاش وعلى أي توزيع تدار من بعدها.",
    expenseDescription:
      "هاد العملية غادي تتمسح ويتلغى الأثر ديالها على الظرف اللي كانت مربوطة به.",
    incomeHint:
      "مثال: إلا مسحتي دخل، الفلوس كيتحيدو من لكاش ومن الأظرفة اللي توزعات عليهم.",
    expenseHint:
      "مثال: إلا مسحتي مصروف، المبلغ كيرجع للظرف اللي كان مربوط به.",
    cancel: "إلغاء",
    delete: "مسح",
  },
};

type ConfirmDeleteTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  transactionType?: "income" | "expense";
};

export function ConfirmDeleteTransactionDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  transactionType,
}: ConfirmDeleteTransactionDialogProps) {
  const { locale, dir } = useAppLocale();
  const copy = TRANSACTION_DELETE_COPY[locale];
  const isIncome = transactionType === "income";
  const description = isIncome ? copy.incomeDescription : copy.expenseDescription;
  const hint = isIncome ? copy.incomeHint : copy.expenseHint;
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent dir={dir}>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
          {hint}
        </p>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="secondary" type="button" disabled={loading}>
              {copy.cancel}
            </Button>
          </DialogClose>
          <Button
            variant="danger"
            type="button"
            isLoading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {copy.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
