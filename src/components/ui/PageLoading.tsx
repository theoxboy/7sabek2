import { SbkWLoader, type SbkWLoaderMode, type SbkWLoaderTheme, type SbkWLoaderSpeed } from "@/components/ui/SbkWLoader";
import type { FloussyLocale } from "@/lib/localePreference";

export interface PageLoadingProps {
  /** Mode d'animation: 'loop' (par défaut pour les chargements de page) ou 'complete' */
  mode?: SbkWLoaderMode;
  theme?: SbkWLoaderTheme;
  locale?: FloussyLocale | "fr" | "ar" | "en";
  speed?: SbkWLoaderSpeed;
  onComplete?: () => void;
  showControls?: boolean;
  fullscreen?: boolean;
}

export function PageLoading({
  mode = "loop",
  theme = "light",
  locale = "fr",
  speed = "normal",
  onComplete,
  showControls = false,
  fullscreen = true,
}: PageLoadingProps) {
  return (
    <SbkWLoader
      mode={mode}
      theme={theme}
      locale={locale}
      speed={speed}
      onComplete={onComplete}
      showControls={showControls}
      fullscreen={fullscreen}
    />
  );
}

export { SbkWLoader };

