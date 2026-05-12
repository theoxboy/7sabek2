"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { PlatformStatusOut } from "@/lib/types";

export function usePlatformStatus() {
  const [status, setStatus] = useState<PlatformStatusOut | null>(null);

  useEffect(() => {
    apiFetch<PlatformStatusOut>("/public/platform-status")
      .then((data) => setStatus(data))
      .catch(() => null);
  }, []);

  return status;
}
