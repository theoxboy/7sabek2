"use client";

import { useMemo } from "react";

type SafeHtmlFrameProps = {
  /** Raw, untrusted HTML (e.g. a rendered e-mail body from the backend). */
  html: string;
  className?: string;
  title?: string;
  /** Text direction for the embedded document. */
  dir?: "ltr" | "rtl";
};

/**
 * Renders untrusted HTML inside a locked-down <iframe> instead of injecting it
 * into the page with dangerouslySetInnerHTML. The sandbox attribute is set
 * WITHOUT `allow-scripts` and WITHOUT `allow-same-origin`, so any <script>,
 * inline handler, or same-origin access in the payload is inert. This is used
 * for superadmin e-mail previews, whose HTML can embed user-controlled data.
 */
export function SafeHtmlFrame({
  html,
  className,
  title = "Preview",
  dir = "ltr",
}: SafeHtmlFrameProps) {
  const srcDoc = useMemo(
    () =>
      `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><base target="_blank"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; font-src https:"></head><body style="margin:0">${html ?? ""}</body></html>`,
    [html, dir],
  );

  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      className={className ?? "h-[420px] w-full border-0"}
      srcDoc={srcDoc}
    />
  );
}
