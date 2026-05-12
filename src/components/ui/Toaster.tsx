"use client";

import { ToastProviderRoot } from "@/components/ui/Toast";

export function Toaster({ children }: { children?: React.ReactNode }) {
  return <ToastProviderRoot>{children}</ToastProviderRoot>;
}
