"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Self-contained reCAPTCHA v2 ("I'm not a robot") checkbox.
 *
 * Loads Google's script once, renders one explicit widget, and reports the
 * solved token (or `null` when it expires / errors) through `onToken`.
 *
 * When `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is absent the component renders nothing
 * and never blocks — the backend skips verification in local/dev too. In any
 * non-local environment the site key is expected to be set.
 */

declare global {
  interface Window {
    // Shape kept identical to the declaration in src/app/register/page.tsx so
    // the two `declare global` blocks merge without a type conflict.
    grecaptcha?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: string;
          size?: string;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaV2Loaded?: () => void;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";

export function isRecaptchaConfigured(): boolean {
  return SITE_KEY.length > 0;
}

export function RecaptchaV2({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!SITE_KEY || typeof window === "undefined") return;
    if (window.grecaptcha) {
      setScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://www.google.com/recaptcha/api.js"]'
    );
    if (existing) {
      const poll = window.setInterval(() => {
        if (window.grecaptcha) {
          window.clearInterval(poll);
          setScriptReady(true);
        }
      }, 200);
      return () => window.clearInterval(poll);
    }
    window.onRecaptchaV2Loaded = () => setScriptReady(true);
    const script = document.createElement("script");
    script.src =
      "https://www.google.com/recaptcha/api.js?onload=onRecaptchaV2Loaded&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      window.onRecaptchaV2Loaded = undefined;
    };
  }, []);

  const mount = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      if (
        node &&
        scriptReady &&
        window.grecaptcha &&
        widgetIdRef.current === null
      ) {
        try {
          widgetIdRef.current = window.grecaptcha.render(node, {
            sitekey: SITE_KEY,
            callback: (token: string) => onToken(token),
            "expired-callback": () => onToken(null),
            "error-callback": () => onToken(null),
          });
        } catch {
          /* a second render attempt on the same node — ignore */
        }
      } else if (!node) {
        widgetIdRef.current = null;
      }
    },
    [scriptReady, onToken]
  );

  useEffect(() => {
    if (scriptReady && nodeRef.current) mount(nodeRef.current);
  }, [scriptReady, mount]);

  if (!SITE_KEY) return null;
  return <div ref={mount} className="flex justify-center" />;
}
