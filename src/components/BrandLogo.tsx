import Image from "next/image";

import type { FloussyLocale } from "@/lib/localePreference";

type BrandLogoProps = {
  locale?: FloussyLocale;
  variant?: "auto" | "simple";
  tone?: "light" | "dark";
  className?: string;
  priority?: boolean;
};

function resolveSrc(
  locale: FloussyLocale,
  variant: "auto" | "simple",
  tone: "light" | "dark"
) {
  if (variant === "simple") return "/brand/logo-simple.png";
  if (tone === "dark") {
    if (locale === "ar") return "/brand/logo-ar-dark.png";
    return "/brand/logo-fr-en-dark.png";
  }
  if (locale === "ar") return "/brand/logo-ar.png";
  return "/brand/logo-fr-en.png";
}

export default function BrandLogo({
  locale = "fr",
  variant = "auto",
  tone = "light",
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={resolveSrc(locale, variant, tone)}
      alt="7sabek"
      width={420}
      height={140}
      priority={priority}
      className={className}
    />
  );
}
