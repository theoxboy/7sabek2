"use client";

import { useEffect, useId, useState } from "react";
import type { FloussyLocale } from "@/lib/localePreference";

export type SbkWLoaderMode = "complete" | "loop";
export type SbkWLoaderTheme = "light" | "dark";
export type SbkWLoaderSpeed = "normal" | "slow";

export interface SbkWLoaderProps {
  /** Mode d'animation: 'complete' (progression 0->100% avec portail) ou 'loop' (boucle indéterminée) */
  mode?: SbkWLoaderMode;
  /** Thème clair ou sombre */
  theme?: SbkWLoaderTheme;
  /** Langue (fr, ar, en) */
  locale?: FloussyLocale | "fr" | "ar" | "en";
  /** Vitesse: 'normal' (1x) ou 'slow' (3x ralenti pour admirer les détails) */
  speed?: SbkWLoaderSpeed;
  /** Callback déclenché à la fin de l'animation complète (après la révélation du portail) */
  onComplete?: () => void;
  /** Affiche les boutons de contrôle interactifs (rejouer, basculer mode/thème/vitesse) */
  showControls?: boolean;
  /** Permet de fermer l'aperçu si affiché en overlay */
  onClose?: () => void;
  /** Affiche en plein écran (fixed overlay) ou dans un conteneur inline */
  fullscreen?: boolean;
  /** Texte ou contenu additionnel personnalisé sous le statut */
  customTag?: string;
  className?: string;
}

const MESSAGES = {
  fr: {
    m1: "On fait les comptes…",
    m2: "On range tes enveloppes…",
    m3: "Ba Omar prépare ses conseils…",
    m4: "C’est prêt !",
    tag: "7sabek lflous",
    replay: "Revoir l’animation",
    modeComplete: "Animation Complète",
    modeLoop: "Animation en Boucle",
    close: "Fermer",
  },
  ar: {
    m1: "كنحسبو الحسابات…",
    m2: "كنرتبو الأظرفة ديالك…",
    m3: "با عمر كيوجد النصائح…",
    m4: "واجد!",
    tag: "حسابك ديال الفلوس",
    replay: "عاود الحركة",
    modeComplete: "حركة كاملة (0% إلى 100%)",
    modeLoop: "حركة مستمرة (حلقة)",
    close: "إغلاق",
  },
  en: {
    m1: "Crunching the numbers…",
    m2: "Sorting your envelopes…",
    m3: "Ba Omar is preparing tips…",
    m4: "All set!",
    tag: "7sabek lflous",
    replay: "Replay animation",
    modeComplete: "Complete animation",
    modeLoop: "Looping animation",
    close: "Close",
  },
};

export function SbkWLoader({
  mode: initialMode = "complete",
  theme: initialTheme = "light",
  locale = "fr",
  speed: initialSpeed = "normal",
  onComplete,
  showControls = false,
  onClose,
  fullscreen = true,
  customTag,
  className = "",
}: SbkWLoaderProps) {
  const [currentMode, setCurrentMode] = useState<SbkWLoaderMode>(initialMode);
  const [currentTheme, setCurrentTheme] = useState<SbkWLoaderTheme>(initialTheme);
  const [currentSpeed, setCurrentSpeed] = useState<SbkWLoaderSpeed>(initialSpeed);
  const [runKey, setRunKey] = useState<number>(0);
  const [percent, setPercent] = useState<number>(0);

  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9-_]/g, "sbk");

  const g7Id = `${idPrefix}-g7`;
  const gsId = `${idPrefix}-gs`;
  const clId = `${idPrefix}-cl`;
  const cwId = `${idPrefix}-cw`;
  const mfId = `${idPrefix}-mf`;
  const mbId = `${idPrefix}-mb`;

  const lang = (locale === "ar" || locale === "en") ? locale : "fr";
  const isRtl = lang === "ar";
  const t = MESSAGES[lang];

  // Synchronisation avec les props externes
  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setCurrentTheme(initialTheme);
  }, [initialTheme]);

  useEffect(() => {
    setCurrentSpeed(initialSpeed);
  }, [initialSpeed]);

  // Compteur numérique de secours fluide pour garantir l'affichage 0 -> 100% même sans CSS Houdini
  useEffect(() => {
    if (currentMode !== "complete") {
      setPercent(0);
      return;
    }

    const duration = currentSpeed === "slow" ? 10800 : 3600; // 3.6s de montée
    const delay = currentSpeed === "slow" ? 6000 : 2000; // démarre après 2s d'intro
    let startTimestamp: number | null = null;
    let timerId: number | null = null;
    let animFrame: number | null = null;

    setPercent(0);

    const timeout = window.setTimeout(() => {
      const step = (now: number) => {
        if (!startTimestamp) startTimestamp = now;
        const elapsed = now - startTimestamp;
        const progress = Math.min(1, elapsed / duration);
        // Émule la courbe cubic-bezier(.45,.05,.35,1)
        const eased = Math.round(progress * progress * (3 - 2 * progress) * 100);
        setPercent(Math.min(100, Math.max(0, eased)));

        if (progress < 1) {
          animFrame = window.requestAnimationFrame(step);
        } else {
          setPercent(100);
          if (onComplete) {
            timerId = window.setTimeout(onComplete, currentSpeed === "slow" ? 6000 : 2000);
          }
        }
      };
      animFrame = window.requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (timerId) window.clearTimeout(timerId);
      if (animFrame) window.cancelAnimationFrame(animFrame);
    };
  }, [currentMode, currentSpeed, runKey, onComplete]);

  const handleReplay = () => {
    setRunKey((k) => k + 1);
  };

  const modeClass = currentMode === "loop" ? "m-loop" : "m-full";
  const themeClass = currentTheme === "dark" ? "t-dark" : "t-light";
  const speedClass = currentSpeed === "slow" ? "k3" : "";

  return (
    <div
      key={runKey}
      className={`sbk-root ${themeClass} ${modeClass} ${speedClass} ${
        fullscreen ? "fixed inset-0 z-[100]" : "relative min-h-[520px] w-full"
      } ${className}`}
      dir={isRtl ? "rtl" : "ltr"}
      role="status"
      aria-live="polite"
      aria-label="7sabek loader"
    >
      <div className="sbk-loader sbk-run">
        <div className="sbk-stage">
          {/* Lueur pulsante */}
          <div className="sbk-glow" aria-hidden="true" />

          {/* Logo 7sabek animé */}
          <div className="sbk-logo">
            <svg
              viewBox="10 540 1880 840"
              width="100%"
              style={{ display: "block", overflow: "visible" }}
              role="img"
              aria-label="7sabek"
            >
              <defs>
                <linearGradient
                  id={g7Id}
                  gradientUnits="userSpaceOnUse"
                  x1="520"
                  y1="560"
                  x2="140"
                  y2="1290"
                >
                  <stop offset="0" stopColor="#00D284" />
                  <stop offset="1" stopColor="#00884F" />
                </linearGradient>

                <linearGradient id={gsId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.75" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>

                {/* Découpe du 7 */}
                <clipPath id={clId}>
                  <path d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z" />
                </clipPath>

                {/* Découpe de révélation du texte sabek */}
                <clipPath id={cwId}>
                  <rect className="sbk-wipe" x="440" y="860" width="1480" height="440" />
                </clipPath>

                {/* Masque de la vague avant (remplissage progressif / oscillations) */}
                <mask id={mfId} maskUnits="userSpaceOnUse" x="-200" y="300" width="1300" height="1200">
                  <g className="sbk-level">
                    <path
                      className="sbk-wave-f"
                      fill="#FFFFFF"
                      d="M-760 0 Q-670.0 -22 -580.0 0 Q-490.0 22 -400.0 0 Q-310.0 -22 -220.0 0 Q-130.0 22 -40.0 0 Q50.0 -22 140.0 0 Q230.0 22 320.0 0 Q410.0 -22 500.0 0 Q590.0 22 680.0 0 Q770.0 -22 860.0 0 Q950.0 22 1040.0 0 Q1130.0 -22 1220.0 0 Q1310.0 22 1400.0 0 Q1490.0 -22 1580.0 0 L1580.0 900 L-760 900 Z"
                    />
                  </g>
                </mask>

                {/* Masque de la vague arrière */}
                <mask id={mbId} maskUnits="userSpaceOnUse" x="-200" y="300" width="1300" height="1200">
                  <g className="sbk-level sbk-level-b">
                    <path
                      className="sbk-wave-b"
                      fill="#FFFFFF"
                      d="M-840 0 Q-735.0 -28 -630.0 0 Q-525.0 28 -420.0 0 Q-315.0 -28 -210.0 0 Q-105.0 28 0.0 0 Q105.0 -28 210.0 0 Q315.0 28 420.0 0 Q525.0 -28 630.0 0 Q735.0 28 840.0 0 Q945.0 -28 1050.0 0 Q1155.0 28 1260.0 0 Q1365.0 -28 1470.0 0 Q1575.0 28 1680.0 0 L1680.0 900 L-840 900 Z"
                    />
                  </g>
                </mask>
              </defs>

              {/* 7 Fantôme (fond estompé) */}
              <path
                className="sbk-7-ghost"
                d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
              />

              {/* Vague secondaire (arrière) */}
              <path
                d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
                fill="#00D284"
                opacity="0.35"
                mask={`url(#${mbId})`}
              />

              {/* Vague principale avec dégradé vert émeraude */}
              <path
                d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
                fill={`url(#${g7Id})`}
                mask={`url(#${mfId})`}
              />

              {/* Ligne tracée au contour du 7 */}
              <path
                className="sbk-7-line"
                d="M143.9 1281.0 27.0 1280.7 23.3 1278.6 22.5 1273.5 26.0 1266.8 65.5 1209.8 80.1 1187.1 100.9 1157.7 107.5 1147.0 178.4 1045.5 276.4 902.2 291.8 880.9 316.8 843.1 339.3 811.7 388.6 738.9 404.8 716.6 417.8 697.5 419.2 693.2 418.2 691.2 415.4 690.4 298.2 691.0 42.7 690.6 39.9 688.9 38.3 686.5 39.7 678.5 57.5 639.4 66.4 617.6 74.1 602.2 79.9 587.7 86.4 576.7 95.5 566.5 104.8 560.2 113.9 556.6 127.6 554.1 633.8 554.1 645.8 556.6 652.9 560.0 657.8 563.5 662.6 568.7 668.2 578.7 671.3 591.4 671.0 605.1 668.6 616.4 663.2 629.8 654.9 644.5 636.2 671.5 535.6 810.6 411.4 985.5 317.2 1115.2 281.8 1166.1 255.8 1201.0 218.5 1254.2 205.1 1267.2 191.3 1275.0 183.0 1277.9 171.0 1280.4 143.9 1281.0Z"
                pathLength="1"
              />

              {/* Texte sabek complet */}
              <g clipPath={`url(#${cwId})`}>
                <path
                  className="sbk-text"
                  fillRule="evenodd"
                  d="M1451.2 1258.9 1422.8 1258.0 1401.8 1254.6 1379.4 1247.9 1366.4 1242.2 1355.0 1235.9 1339.3 1224.6 1323.5 1208.8 1317.9 1201.4 1310.2 1189.1 1300.6 1167.0 1294.3 1184.7 1289.3 1195.1 1279.6 1210.4 1271.2 1220.6 1257.5 1233.3 1243.8 1242.6 1231.1 1248.9 1217.1 1253.9 1199.7 1257.7 1185.4 1259.0 1168.7 1258.7 1150.7 1256.0 1137.0 1251.9 1125.6 1246.6 1113.3 1238.0 1105.3 1230.1 1104.3 1254.6 1019.9 1254.5 1019.8 905.7 1108.9 905.7 1109.3 1020.7 1119.6 1012.4 1132.0 1005.0 1143.7 1000.3 1159.7 996.6 1172.7 995.2 1192.1 995.6 1208.1 997.9 1225.8 1003.0 1241.8 1010.3 1253.2 1017.4 1265.5 1027.3 1274.4 1036.5 1284.3 1049.8 1290.6 1060.7 1296.3 1073.5 1300.6 1086.2 1306.3 1072.1 1313.2 1058.8 1322.8 1045.1 1333.8 1033.1 1345.9 1023.1 1355.4 1016.7 1371.7 1008.0 1388.7 1001.7 1407.8 997.3 1426.5 995.2 1443.8 995.2 1462.5 997.3 1479.2 1001.0 1496.9 1007.4 1510.3 1014.0 1526.0 1024.6 1538.0 1035.6 1549.4 1049.7 1556.5 1061.2 1564.4 1079.2 1568.9 1095.2 1571.5 1113.6 1571.9 1131.3 1570.3 1149.3 1385.3 1150.0 1387.3 1156.3 1391.0 1163.7 1396.6 1171.4 1402.4 1176.9 1415.8 1184.8 1432.5 1189.5 1441.5 1190.6 1454.2 1190.6 1472.2 1187.8 1486.9 1182.1 1497.3 1175.8 1506.6 1168.7 1553.1 1217.1 1551.0 1220.3 1543.3 1227.6 1532.1 1236.1 1520.0 1243.2 1509.6 1247.9 1494.6 1252.9 1480.9 1256.0 1462.9 1258.3 1451.2 1258.9ZM1872.6 1254.6 1765.1 1254.5 1693.3 1165.6 1667.2 1192.1 1666.8 1254.5 1577.7 1254.4 1577.9 905.6 1667.0 905.9 1667.2 1087.8 1758.4 999.7 1863.5 999.7 1758.7 1108.9 1869.4 1249.5 1872.9 1254.2 1872.6 1254.6ZM615.4 1261.3 596.4 1261.0 572.7 1259.0 551.6 1255.7 531.3 1250.9 515.6 1246.2 495.9 1238.5 483.8 1232.5 472.1 1225.1 502.5 1156.7 527.2 1169.9 549.3 1178.4 576.7 1185.5 600.7 1188.6 616.7 1188.9 627.1 1188.2 645.8 1184.5 652.1 1181.8 658.0 1177.7 662.9 1171.4 664.6 1165.7 664.6 1158.3 662.9 1152.7 660.5 1148.8 653.5 1142.9 641.1 1137.6 628.4 1133.6 567.7 1118.7 550.6 1113.7 531.3 1106.7 517.2 1099.0 507.2 1091.7 495.0 1079.9 488.8 1071.2 481.8 1055.8 478.0 1037.8 477.7 1017.1 481.1 998.1 485.4 986.0 488.8 979.2 499.1 964.0 511.9 951.2 527.6 940.2 548.6 930.2 573.0 923.1 601.0 919.1 633.8 918.4 665.8 921.5 695.2 927.5 717.9 934.9 730.9 940.5 742.4 946.6 742.8 947.6 740.7 953.0 714.2 1016.0 681.2 1001.3 660.8 995.3 638.4 991.6 617.1 990.9 604.7 991.9 594.4 994.0 587.0 996.7 581.7 999.7 575.3 1005.3 572.9 1008.8 570.5 1014.4 569.8 1022.4 571.0 1027.6 575.2 1034.1 581.0 1038.5 585.7 1040.9 608.4 1048.2 654.5 1058.8 680.8 1066.1 702.9 1074.1 716.9 1081.8 729.8 1091.6 743.0 1105.9 750.7 1119.9 756.2 1140.3 767.3 1128.1 779.0 1119.9 794.4 1112.9 809.7 1108.5 823.1 1106.1 845.1 1104.1 909.1 1103.6 908.7 1098.2 906.6 1089.9 903.6 1083.5 900.2 1078.7 894.9 1073.7 890.2 1070.8 883.9 1067.8 872.5 1064.7 852.5 1063.4 842.8 1064.0 827.1 1066.8 804.4 1074.5 786.0 1085.2 756.0 1025.1 765.3 1019.0 779.0 1012.4 807.1 1003.0 827.8 998.6 841.5 996.6 859.2 995.2 879.2 995.2 902.9 997.6 916.9 1000.3 929.6 1004.0 941.3 1008.7 950.3 1013.4 961.8 1021.1 969.7 1028.0 977.0 1036.4 983.4 1045.8 990.4 1060.5 993.8 1070.9 997.2 1087.2 998.6 1099.9 998.6 1254.5 915.9 1254.6 914.9 1222.9 908.1 1233.1 899.9 1241.3 890.9 1247.6 877.5 1253.6 864.2 1257.0 845.1 1259.0 825.4 1258.3 809.1 1255.7 794.7 1251.2 784.0 1246.3 775.0 1240.6 767.7 1234.6 761.5 1228.1 755.9 1220.5 750.9 1210.8 746.6 1198.2 737.6 1212.2 725.9 1224.9 712.6 1235.2 695.2 1244.9 674.5 1252.9 658.1 1257.0 638.1 1260.0 615.4 1261.3ZM1487.8 1102.6 1485.6 1092.9 1481.3 1083.5 1476.7 1076.9 1470.2 1070.4 1463.2 1065.4 1455.2 1061.8 1447.2 1059.7 1437.2 1058.7 1426.5 1059.4 1416.8 1061.8 1409.1 1065.1 1401.1 1070.7 1394.9 1076.9 1390.0 1084.2 1386.3 1092.2 1383.8 1101.9 1385.1 1102.7 1487.8 1102.6ZM1168.2 1187.4 1177.0 1185.8 1188.7 1180.8 1198.4 1173.2 1206.2 1163.4 1211.2 1152.7 1214.2 1139.6 1214.9 1132.0 1214.2 1113.9 1211.5 1101.9 1206.5 1090.9 1200.6 1082.9 1193.2 1076.2 1186.1 1071.8 1174.4 1067.7 1165.0 1066.4 1151.7 1067.0 1140.3 1070.1 1130.6 1075.5 1122.3 1082.7 1116.2 1090.9 1111.5 1100.9 1108.5 1113.6 1107.8 1119.9 1108.1 1137.3 1110.2 1148.3 1113.8 1158.3 1118.3 1166.1 1125.6 1174.5 1134.6 1181.1 1144.7 1185.4 1155.3 1187.5 1168.2 1187.4ZM870.7 1202.1 879.9 1200.5 890.2 1196.2 896.9 1191.6 902.6 1185.5 905.7 1180.7 909.4 1172.4 909.0 1150.7 871.5 1150.5 855.8 1151.9 847.8 1153.9 842.8 1156.3 839.5 1158.5 835.5 1162.9 832.7 1168.7 831.6 1178.0 833.7 1186.7 838.3 1193.4 843.1 1197.1 851.8 1200.8 860.5 1202.2 870.7 1202.1Z"
                />
              </g>

              {/* Éclat lumineux traversant le 7 */}
              <g clipPath={`url(#${clId})`}>
                <rect
                  className="sbk-sheen"
                  x="-400"
                  y="500"
                  width="420"
                  height="900"
                  fill={`url(#${gsId})`}
                />
              </g>

              {/* Cercles de pulsation et de résonance */}
              <circle className="sbk-ring" cx="1273" cy="1316" r="45" />
              <circle className="sbk-ring sbk-ring2" cx="1273" cy="1316" r="45" />

              {/* Point vert qui chute avec rebond élastique */}
              <circle className="sbk-dot" cx="1273" cy="1316" r="45" fill="#43B95E" />
            </svg>

            {/* Onde de submersion lumineuse */}
            <div className="sbk-flood" aria-hidden="true" />
          </div>

          {/* Statut et messages cycliques / séquentiels */}
          <div className="sbk-status" role="status" aria-live="polite">
            <div className="sbk-msgs">
              <span className="sbk-m sbk-m1">{t.m1}</span>
              <span className="sbk-m sbk-m2">{t.m2}</span>
              <span className="sbk-m sbk-m3">{t.m3}</span>
              {currentMode === "complete" && <span className="sbk-m sbk-m4">{t.m4}</span>}
            </div>

            {/* Pourcentage (affiché uniquement en mode complète) */}
            {currentMode === "complete" && (
              <div className="sbk-pct" aria-hidden="true">
                {percent > 0 && <span className="sbk-pct-val">{percent}%</span>}
              </div>
            )}
          </div>

          {/* Signature / Slogan 7sabek */}
          <div className="sbk-tag">{customTag || t.tag}</div>
        </div>
      </div>

      {/* Anneau de transition pour le portail (mode complète) */}
      {currentMode === "complete" && <div className="sbk-portal-ring" aria-hidden="true" />}

      {/* Barre d'outils / Contrôles interactifs si demandés */}
      {showControls && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/95 dark:bg-emerald-950/90 border border-emerald-500/25 shadow-2xl backdrop-blur-md">
          {/* Bascule Mode : Complète vs Boucle */}
          <div className="flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/40 p-1 border border-emerald-200/60 dark:border-emerald-700/50">
            <button
              type="button"
              onClick={() => {
                setCurrentMode("complete");
                setRunKey((k) => k + 1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                currentMode === "complete"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-900 dark:text-emerald-200 hover:text-emerald-600"
              }`}
            >
              Complète (0→100%)
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentMode("loop");
                setRunKey((k) => k + 1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                currentMode === "loop"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-900 dark:text-emerald-200 hover:text-emerald-600"
              }`}
            >
              Boucle (infinie)
            </button>
          </div>

          {/* Vitesse */}
          <button
            type="button"
            onClick={() => {
              setCurrentSpeed((s) => (s === "normal" ? "slow" : "normal"));
              setRunKey((k) => k + 1);
            }}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200/70 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
            title="Vitesse d'animation"
          >
            {currentSpeed === "slow" ? "🐢 ×3 Ralentie" : "⚡ 1× Normale"}
          </button>

          {/* Thème */}
          <button
            type="button"
            onClick={() => setCurrentTheme((th) => (th === "light" ? "dark" : "light"))}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200/70 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
            title="Changer de thème"
          >
            {currentTheme === "dark" ? "🌙 Sombre" : "☀️ Clair"}
          </button>

          {/* Bouton Rejouer */}
          <button
            type="button"
            onClick={handleReplay}
            className="sbk-replay inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-95 cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            {t.replay}
          </button>

          {/* Bouton Fermer si overlay */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
              aria-label={t.close}
              title={t.close}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
