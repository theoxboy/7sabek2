"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { isAnalyticsConsentGranted, COOKIE_CONSENT_UPDATED_EVENT } from "@/lib/cookie-consent";

export function MicrosoftClarity() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    // Check initial consent status on mount (client-side only)
    setConsentGranted(isAnalyticsConsentGranted());

    const handleConsentChange = () => {
      setConsentGranted(isAnalyticsConsentGranted());
    };

    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleConsentChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, handleConsentChange);
    };
  }, []);

  if (!projectId) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Microsoft Clarity project ID missing");
    }
    return null;
  }

  if (!consentGranted) {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;
          t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];
          y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${projectId}");
      `}
    </Script>
  );
}
