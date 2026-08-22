"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/api";
import { localizeCategoryName } from "@/lib/categoryCatalog";
import { localizeEnvelopeLabel } from "@/lib/envelopeLocalization";
import type { FloussyLocale } from "@/lib/localePreference";
import type { CategoryOut, EnvelopeOut, TransactionOut } from "@/lib/types";
import { TRANSACTIONS_COPY } from "@/lib/translations/translations";
import { ConfirmDeleteTransactionDialog } from "@/components/transactions/ConfirmDeleteTransactionDialog";

type TransactionRow = TransactionOut & {
  category_name?: string;
  envelope_name?: string;
  optimistic?: boolean;
};

interface TransactionHistoryTableProps {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  locale: FloussyLocale;
  transactions: TransactionRow[];
  setTransactions: React.Dispatch<React.SetStateAction<TransactionRow[]>>;
  categories: CategoryOut[];
  envelopes: EnvelopeOut[];
  mappings: Record<string, string>;
  loadData: () => Promise<void>;
  onEdit: (tx: TransactionRow) => void;
  duplicateOpen: boolean;
  setDuplicateOpen: (open: boolean) => void;
  focusTxId?: string | null;
}

const PAGE_SIZES = [10, 20, 50];

const toDate = (value: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLocaleDate = (value: string, locale: FloussyLocale) => {
  if (!value) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const localeCode =
    locale === "fr" ? "fr-FR" : locale === "ar" ? "ar-MA" : "en-CA";
  return parsed.toLocaleDateString(localeCode, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const TransactionHistoryTable: React.FC<TransactionHistoryTableProps> = ({
  isOpen,
  setOpen,
  locale,
  transactions,
  setTransactions,
  categories,
  envelopes,
  mappings,
  loadData,
  onEdit,
  duplicateOpen,
  setDuplicateOpen,
  focusTxId = null,
}) => {
  const { toast } = useToast();
  const copy = TRANSACTIONS_COPY[locale];
  const periodArrow = locale === "ar" ? "←" : "→";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null);
  const [duplicateProcessing, setDuplicateProcessing] = useState(false);

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    type: "all",
    category: "all",
    envelope: "all",
    search: "",
  });

  const envelopeMap = useMemo(() => new Map(envelopes.map((e) => [e.id, e.name])), [envelopes]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const escapeValue = (val: string) => {
    const clean = val.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const handleDownloadCsv = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ["Date", "Type", "Category", "Envelope", "Amount", "Description"];
    const rows = filteredTransactions.map((tx) => [
      tx.occurred_on,
      tx.type,
      tx.category_name ?? "-",
      tx.envelope_name ?? "-",
      tx.amount,
      tx.description ?? "",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => escapeValue(String(cell))).join(",")),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `transactions-${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const filteredTransactions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        if (filters.type !== "all" && tx.type !== filters.type) return false;
        if (filters.category !== "all" && tx.category_id !== filters.category) return false;
        if (filters.envelope !== "all") {
          const mappedId = mappings[tx.category_id];
          const envelopeName =
            tx.type === "income"
              ? copy.cash
              : mappedId
              ? localizeEnvelopeLabel(envelopeMap.get(mappedId) ?? copy.mapped, locale)
              : copy.unmapped;
          if (envelopeName !== filters.envelope) return false;
        }
        if (filters.from) {
          const fromDate = toDate(filters.from);
          const txDate = toDate(tx.occurred_on);
          if (fromDate && txDate && txDate < fromDate) return false;
        }
        if (filters.to) {
          const toDateValue = toDate(filters.to);
          const txDate = toDate(tx.occurred_on);
          if (toDateValue && txDate && txDate > toDateValue) return false;
        }
        if (search) {
          const haystack = `${tx.description ?? ""} ${tx.category_name ?? ""}`.toLowerCase().trim();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
  }, [transactions, filters, mappings, envelopeMap, locale, copy]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // Duplicate logic
  const buildDuplicateKey = (tx: any) =>
    `${tx.type}|${tx.category_id}|${tx.occurred_on}|${Number(tx.amount).toFixed(2)}|${tx.description ?? ""}`;

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, TransactionRow[]>();
    transactions.forEach((tx) => {
      const key = buildDuplicateKey(tx);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    });
    const sortByCreated = (a: TransactionRow, b: TransactionRow) => {
      if (a.created_at && b.created_at) {
        return a.created_at.localeCompare(b.created_at);
      }
      if (a.occurred_on !== b.occurred_on) {
        return a.occurred_on.localeCompare(b.occurred_on);
      }
      return a.id.localeCompare(b.id);
    };
    return Array.from(map.values())
      .filter((list) => list.length > 1)
      .map((list) => list.slice().sort(sortByCreated))
      .sort((a, b) => b[0].occurred_on.localeCompare(a[0].occurred_on));
  }, [transactions]);

  const duplicateCount = useMemo(
    () => duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0),
    [duplicateGroups]
  );

  const handleDelete = async (transactionId: string): Promise<boolean> => {
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));

    try {
      if (transactionId.startsWith("temp-")) {
        return true;
      }
      setDeleting(true);
      await apiFetch<void>(`/transactions/${transactionId}`, {
        method: "DELETE",
      });
      await loadData();
      toast({
        title: copy.transactionDeleted,
        description: copy.transactionDeletedDescription,
        variant: "success",
      });
      // Emit event for real-time dashboard updates
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("floussy:data-updated"));
      }
      return true;
    } catch (err) {
      setTransactions(snapshot);
      const message = err instanceof Error ? err.message : copy.unknownError;
      toast({
        title: copy.unknownError,
        description: message,
        variant: "danger",
      });
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDuplicates = async () => {
    if (duplicateProcessing) return;
    const groups = duplicateGroups;
    if (groups.length === 0) return;
    setDuplicateProcessing(true);

    try {
      const toRemove = groups.flatMap((group) => group.slice(1).map((tx) => tx.id));
      const tempIds = toRemove.filter((id) => id.startsWith("temp-"));
      const serverIds = toRemove.filter((id) => !id.startsWith("temp-"));

      const results = await Promise.allSettled(
        serverIds.map((id) => apiFetch<void>(`/transactions/${id}`, { method: "DELETE" }))
      );

      const successIds = [...tempIds];
      const failedIds: string[] = [];
      results.forEach((result, index) => {
        const id = serverIds[index];
        if (result.status === "fulfilled") {
          successIds.push(id);
        } else {
          failedIds.push(id);
        }
      });

      if (successIds.length > 0) {
        setTransactions((prev) => prev.filter((tx) => !successIds.includes(tx.id)));
      }

      if (failedIds.length === 0) {
        toast({
          title: copy.duplicatesDeleted,
          description: copy.duplicatesDeletedDescription(successIds.length),
          variant: "success",
        });
      } else {
        toast({
          title: copy.partialDelete,
          description: copy.partialDeleteDescription(successIds.length, failedIds.length),
          variant: "danger",
        });
      }

      await loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("floussy:data-updated"));
      }
    } finally {
      setDuplicateProcessing(false);
      setDuplicateOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <DialogTitle>{copy.title}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => setDuplicateOpen(true)}
                    disabled={duplicateCount === 0}
                  >
                    {copy.duplicates} {duplicateCount > 0 ? `(${duplicateCount})` : ""}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={filteredTransactions.length === 0}
                  >
                    {copy.downloadCsv}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">{copy.historyFilters}</p>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              <Card className="p-4 mb-6">
                <div className="grid gap-3 md:grid-cols-5">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.from}</span>
                    <input
                      type="date"
                      value={filters.from}
                      onChange={(event) => handleFilterChange("from", event.target.value)}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.to}</span>
                    <input
                      type="date"
                      value={filters.to}
                      onChange={(event) => handleFilterChange("to", event.target.value)}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.type}</span>
                    <select
                      value={filters.type}
                      onChange={(event) => handleFilterChange("type", event.target.value)}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <option value="all">{copy.all}</option>
                      <option value="income">{copy.income}</option>
                      <option value="expense">{copy.expense}</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.category}</span>
                    <select
                      value={filters.category}
                      onChange={(event) => handleFilterChange("category", event.target.value)}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <option value="all">{copy.all}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {localizeCategoryName(cat.name, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">{copy.envelope}</span>
                    <select
                      value={filters.envelope}
                      onChange={(event) => handleFilterChange("envelope", event.target.value)}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <option value="all">{copy.all}</option>
                      <option value={copy.cash}>{copy.cash}</option>
                      <option value={copy.unmapped}>{copy.unmapped}</option>
                      {envelopes
                        .filter((env) => !env.is_cash)
                        .map((env) => (
                          <option key={env.id} value={localizeEnvelopeLabel(env.name, locale)}>
                            {localizeEnvelopeLabel(env.name, locale)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-xs text-[var(--muted)]">{copy.search}</span>
                    <input
                      value={filters.search}
                      onChange={(event) => handleFilterChange("search", event.target.value)}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      placeholder={copy.searchPlaceholder}
                    />
                  </label>
                </div>
              </Card>

              <div>
                {filteredTransactions.length === 0 ? (
                  <EmptyState title={copy.noTransactions} description={copy.noTransactionsDescription} />
                ) : (
                  <Card className="p-0 overflow-hidden">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-[var(--border)] bg-slate-50 dark:bg-slate-800 text-xs uppercase text-[var(--muted)]">
                          <tr>
                            <th className="px-4 py-3">{copy.tableDate}</th>
                            <th className="px-4 py-3">{copy.tableType}</th>
                            <th className="px-4 py-3">{copy.tableCategory}</th>
                            <th className="px-4 py-3">{copy.tableEnvelope}</th>
                            <th className="px-4 py-3">{copy.tableAmount}</th>
                            <th className="px-4 py-3">{copy.tableDescription}</th>
                            <th className="px-4 py-3 text-right">{copy.tableActions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          <AnimatePresence initial={false}>
                            {pagedTransactions.map((tx) => (
                              <motion.tr
                                key={tx.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className={`transition hover:bg-[var(--surface-2)] ${
                                  tx.optimistic ? "opacity-60" : ""
                                } ${focusTxId && tx.id === focusTxId ? "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-300" : ""}`}
                              >
                                <td className="px-4 py-3 font-medium">{tx.occurred_on}</td>
                                <td className="px-4 py-3 capitalize">
                                  {tx.type === "income" ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{copy.income}</span>
                                  ) : (
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">{copy.expense}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {tx.category_name ? localizeCategoryName(tx.category_name, locale) : "-"}
                                </td>
                                <td className="px-4 py-3">
                                  {tx.envelope_name ? localizeEnvelopeLabel(tx.envelope_name, locale) : "-"}
                                </td>
                                <td className="px-4 py-3 font-semibold">{tx.amount}</td>
                                <td className="px-4 py-3">{tx.description ?? "-"}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        onEdit(tx);
                                        setOpen(false);
                                      }}
                                    >
                                      {copy.edit}
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(tx)}>
                                      {copy.delete}
                                    </Button>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted)]">{copy.rows}</span>
                        <select
                          value={pageSize}
                          onChange={(event) => {
                            setPageSize(Number(event.target.value));
                            setPage(1);
                          }}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                        >
                          {PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                          disabled={page === 1}
                        >
                          {copy.prev}
                        </Button>
                        <span className="text-xs text-[var(--muted)]">{copy.pageOf(page, totalPages)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={page === totalPages}
                        >
                          {copy.next}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b border-[var(--border)] px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <DialogTitle>{copy.duplicateTitle}</DialogTitle>
                  <p className="text-sm text-[var(--muted)]">{copy.duplicateSubtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="muted">{copy.duplicateCount(duplicateCount)}</Badge>
                  <Button
                    size="sm"
                    variant="danger"
                    type="button"
                    onClick={handleDeleteDuplicates}
                    disabled={duplicateCount === 0 || duplicateProcessing}
                  >
                    {copy.deleteDuplicates}
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              {duplicateGroups.length === 0 ? (
                <EmptyState title={copy.noDuplicates} description={copy.noDuplicatesDescription} />
              ) : (
                <div className="grid gap-4">
                  {duplicateGroups.map((group, index) => {
                    const keeper = group[0];
                    return (
                      <Card key={`${keeper.id}-${index}`} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ink)]">
                              {keeper.category_name
                                ? localizeCategoryName(keeper.category_name, locale)
                                : copy.categoryFallback}{" "}
                              • {keeper.amount}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {keeper.occurred_on} • {keeper.type === "income" ? copy.income : copy.expense}
                            </p>
                            <p className="text-xs text-[var(--muted)]">{keeper.description ?? "-"}</p>
                          </div>
                          <Badge tone="muted">
                            {group.length} {copy.entries}
                          </Badge>
                        </div>
                        <div className="grid gap-2">
                          {group.map((tx, idx) => (
                            <div
                              key={tx.id}
                              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${
                                idx === 0
                                  ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300"
                                  : "border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <p className="font-semibold text-xs">
                                  {idx === 0 ? copy.kept : copy.duplicate}
                                </p>
                                <p className="text-[10px] opacity-75">
                                  ID: {tx.id} • {tx.created_at ? formatLocaleDate(tx.created_at, locale) : "No date"}
                                </p>
                              </div>
                              {idx > 0 && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={deleting}
                                  onClick={() => handleDelete(tx.id)}
                                >
                                  {copy.delete}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteTransactionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (deleteTarget) {
            await handleDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        loading={deleting}
        transactionType={deleteTarget?.type}
      />
    </>
  );
};
