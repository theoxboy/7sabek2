import packageJson from "../../package.json";

import { LATEST_RELEASE } from "./changelog";

const DEFAULT_VERSION = "1.2.1";

/**
 * Source of truth for the version shown in the UI: the newest entry in
 * `src/lib/changelog.ts`. An env override still wins (useful for hotfix builds),
 * then package.json, then the hard default.
 */
export const APP_VERSION = (
  process.env.NEXT_PUBLIC_APP_VERSION ||
  LATEST_RELEASE?.version ||
  packageJson.version ||
  DEFAULT_VERSION
).trim();
export const APP_BUILD_ID = (process.env.NEXT_PUBLIC_APP_BUILD_ID || "").trim();

export function getAppVersionLabel(options?: { includeBuild?: boolean }): string {
  const version = APP_VERSION || DEFAULT_VERSION;
  if (options?.includeBuild && APP_BUILD_ID) {
    return `v${version} · build ${APP_BUILD_ID}`;
  }
  return `v${version}`;
}
