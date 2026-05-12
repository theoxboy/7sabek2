"use client";

export const GLOBAL_TOURS_DISABLED_STORAGE_KEY =
  "floussy.platform.tours.disabled";

export const areToursGloballyDisabled = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GLOBAL_TOURS_DISABLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeGlobalToursDisabled = (disabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      GLOBAL_TOURS_DISABLED_STORAGE_KEY,
      disabled ? "1" : "0"
    );
  } catch {
    // Ignore storage write failures.
  }
};
