"use client";

export function PageLoading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-xs dark:bg-black/60"
      role="status"
      aria-label="Chargement..."
    >
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-emerald-500/20 border-t-emerald-600" />
    </div>
  );
}
