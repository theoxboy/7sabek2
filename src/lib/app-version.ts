import packageJson from "../../package.json";

const DEFAULT_VERSION = "1.2.1";

export const APP_VERSION =
  (process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version || DEFAULT_VERSION).trim();
export const APP_BUILD_ID = (process.env.NEXT_PUBLIC_APP_BUILD_ID || "").trim();

export function getAppVersionLabel(options?: { includeBuild?: boolean }): string {
  const version = APP_VERSION || DEFAULT_VERSION;
  if (options?.includeBuild && APP_BUILD_ID) {
    return `v${version} · build ${APP_BUILD_ID}`;
  }
  return `v${version}`;
}
