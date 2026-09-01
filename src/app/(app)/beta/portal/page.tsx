"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Lock,
  Check,
  Sparkles,
  ChevronRight,
  Bell,
  ArrowLeft,
} from "lucide-react";
import { useAppLocale, useForceArabicDocumentFont } from "@/lib/appLocale";

// Audio Synthesizer for high-fidelity interactive feedback
const playSound = (
  type: "click" | "success" | "error" | "bell",
  muted: boolean,
) => {
  if (muted) return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      const scale = [523.25, 659.25, 783.99, 1046.5];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.06 + 0.3,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.3);
      });
    } else if (type === "bell") {
      const scale = [880, 1320];
      scale.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.1 + 0.6,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.6);
      });
    } else if (type === "error") {
      const frequencies = [160, 155];
      frequencies.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      });
    }
  } catch (err) {
    console.debug("Blocked audio play:", err);
  }
};

const PORTAL_COPY = {
  fr: {
    back: "Retour au Hub",
    title: "Centre de notifications",
    successAuth: "Succès d'identification !",
    wrongPin: "Code PIN erroné !",
    fingerprintSuccess: "Empreinte reconnue !",
    scanInterrupted: "Scan interrompu ! Gardez votre doigt posé.",
    scanningMessage: "Analyse biométrique en cours...",
    holdFingerMessage: "Posez & maintenez le doigt sur le capteur",
    biometricsEnabled: "Biométrie activée",
    accessSecured: "Accès Sécurisé",
    welcomeBack: "Bienvenue dans votre espace 7sabek",
    greeting: (userName: string) => `Bonjour, ${userName}`,
    authSubtitle: "Authentifiez-vous par code PIN ou par Empreinte",
    demoPin: "Code PIN Démo: ",
    tabFingerprint: "Empreinte",
    tabPin: "Code PIN",
    clear: "EFFACER",
    backspace: "RETOUR",
    newRoutine: "Nouvelle routine ?",
    newAccount: "Nouveau compte",
    newAccountDesc: "Modifiez ou créez le profil utilisateur de votre routine budget.",
    inputName: "Nom de l'utilisateur",
    inputPin: "Code PIN (4 chiffres)",
    btnCancel: "Annuler",
    btnCreate: "Créer",
    inputNamePlaceholder: "Ex: Youssef El Alami",
    inputPinPlaceholder: "Ex: 1234",
  },
  en: {
    back: "Back to Hub",
    title: "Notification Center",
    successAuth: "Identification successful!",
    wrongPin: "Incorrect PIN!",
    fingerprintSuccess: "Fingerprint recognized!",
    scanInterrupted: "Scan interrupted! Keep your finger pressed.",
    scanningMessage: "Biometric analysis in progress...",
    holdFingerMessage: "Place & hold your finger on the sensor",
    biometricsEnabled: "Biometrics enabled",
    accessSecured: "Secure Access",
    welcomeBack: "Welcome to your 7sabek workspace",
    greeting: (userName: string) => `Hello, ${userName}`,
    authSubtitle: "Authenticate using PIN or Fingerprint",
    demoPin: "Demo PIN: ",
    tabFingerprint: "Fingerprint",
    tabPin: "PIN Code",
    clear: "CLEAR",
    backspace: "BACK",
    newRoutine: "New routine?",
    newAccount: "New account",
    newAccountDesc: "Modify or create the user profile for your budget routine.",
    inputName: "Username",
    inputPin: "PIN Code (4 digits)",
    btnCancel: "Cancel",
    btnCreate: "Create",
    inputNamePlaceholder: "e.g., Youssef El Alami",
    inputPinPlaceholder: "e.g., 1234",
  },
  ar: {
    back: "رجوع للمركز",
    title: "مركز الإشعارات",
    successAuth: "تم التعرف بنجاح!",
    wrongPin: "رمز PIN غلط!",
    fingerprintSuccess: "تم التعرف على البصمة!",
    scanInterrupted: "تقطع المسح! خلي صبعك محطوط.",
    scanningMessage: "تحليل البصمة خدام...",
    holdFingerMessage: "حط و خلي صبعك على الحساس",
    biometricsEnabled: "البصمة مفعلة",
    accessSecured: "ولوج مؤمن",
    welcomeBack: "مرحبا بيك فالحساب ديالك",
    greeting: (userName: string) => `أهلاً، ${userName}`,
    authSubtitle: "أكد الهوية ديالك بالـ PIN ولا بالبصمة",
    demoPin: "رمز PIN التجريبي: ",
    tabFingerprint: "البصمة",
    tabPin: "رمز PIN",
    clear: "مسح",
    backspace: "رجوع",
    newRoutine: "حساب جديد؟",
    newAccount: "حساب جديد",
    newAccountDesc: "عدل ولا صاوب بروفايل جديد للميزانية ديالك.",
    inputName: "سمية المستخدم",
    inputPin: "رمز PIN (4 د الأرقام)",
    btnCancel: "إلغاء",
    btnCreate: "إنشاء",
    inputNamePlaceholder: "مثال: يوسف العلمي",
    inputPinPlaceholder: "مثال: 1234",
  },
};

export default function BetaPortalPage() {
  const router = useRouter();
  const { locale, dir } = useAppLocale();
  useForceArabicDocumentFont(locale === "ar", "beta-portal-ar-body");
  const copy = PORTAL_COPY[locale];

  // Profile States
  const [userName, setUserName] = useState<string>("Youssef El Alami");
  const [userPin, setUserPin] = useState<string>("1234");

  // Scanner states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Authentication validation
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  // New account interactive trigger modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalName, setModalName] = useState<string>("");
  const [modalPin, setModalPin] = useState<string>("");

  // Login states
  const [activeTab, setActiveTab] = useState<"fingerprint" | "pin">("fingerprint");
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Authenticate entered PIN code
  useEffect(() => {
    if (enteredPin.length === 4) {
      if (enteredPin === userPin) {
        playSound("success", false);
        setAuthenticated(true);
        setStatusMessage(copy.successAuth);

        const timer = setTimeout(() => {
          setAuthenticated(false);
          setEnteredPin("");
          setStatusMessage(null);
          router.push("/notifications");
        }, 1800);
        return () => clearTimeout(timer);
      } else {
        playSound("error", false);
        setPinError(true);
        setStatusMessage(copy.wrongPin);
        const timer = setTimeout(() => {
          setPinError(false);
          setEnteredPin("");
          setStatusMessage(null);
        }, 650);
        return () => clearTimeout(timer);
      }
    }
  }, [enteredPin, userPin, router, copy]);

  // Handle biometric fingerprint scanning routines on mouse/touch down
  const handleStartScan = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (scanSuccess || authenticated) return;

    setStatusMessage(null);
    setIsScanning(true);
    setScanProgress(0);
    playSound("click", false);

    scanIntervalRef.current = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
          playSound("success", false);
          setScanSuccess(true);
          setAuthenticated(true);
          setStatusMessage(copy.fingerprintSuccess);

          setTimeout(() => {
            setAuthenticated(false);
            setScanSuccess(false);
            setIsScanning(false);
            setScanProgress(0);
            setStatusMessage(null);
            router.push("/notifications");
          }, 1800);
          return 100;
        }
        if (prev % 20 === 0) {
          playSound("click", false);
        }
        return prev + 5;
      });
    }, 40);
  };

  const handleEndScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    if (isScanning && scanProgress < 100) {
      setIsScanning(false);
      playSound("error", false);
      setStatusMessage(copy.scanInterrupted);
      setScanProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  // Handle keyboard typing for standard PIN in active viewport
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "pin" || authenticated) return;
      if (e.key >= "0" && e.key <= "9") {
        if (enteredPin.length < 4) {
          playSound("click", false);
          setEnteredPin((prev) => prev + e.key);
        }
      } else if (e.key === "Backspace") {
        playSound("click", false);
        setEnteredPin((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enteredPin, activeTab, authenticated]);

  const handleKeypadPress = (num: string) => {
    if (enteredPin.length < 4 && !authenticated) {
      playSound("click", false);
      setEnteredPin((prev) => prev + num);
    }
  };

  const handleCreateAccountSim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim() || modalPin.length !== 4) {
      playSound("error", false);
      return;
    }
    playSound("success", false);
    setUserName(modalName);
    setUserPin(modalPin);
    setShowModal(false);
    setEnteredPin("");
    setScanProgress(0);
  };

  return (
    <div
      dir={dir}
      className="w-full flex flex-col select-none bg-[var(--surface-2)] relative text-[var(--ink)] font-sans min-h-screen justify-start md:justify-center items-center p-4 py-8 xs:py-10 sm:p-6 md:p-8 lg:p-12 overflow-y-auto"
    >
      {/* Immersive ambient glowing background blur circles */}
      <div className="absolute top-[-15%] left-[-15%] w-[68vw] h-[68vw] rounded-full bg-gradient-to-tr from-emerald-400/20 to-teal-400/10 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div
        className="absolute bottom-[-15%] right-[-15%] w-[68vw] h-[68vw] rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-500/10 blur-[130px] pointer-events-none animate-pulse-slow font-sans"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="absolute top-[30%] left-[30%] w-[45vw] h-[45vw] rounded-full bg-sky-300/15 blur-[140px] pointer-events-none animate-pulse-slow"
        style={{ animationDelay: "6s" }}
      />

      {/* Top minimal decorative brand line with dynamic light sweep anim */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--surface)] overflow-hidden z-10 w-full backdrop-blur-xs">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="h-full w-2/5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-600"
        />
      </div>

      <div className={`${locale === "ar" ? "absolute top-6 right-6 z-40" : "absolute top-6 left-6 z-40"}`}>
        <button
          type="button"
          onClick={() => {
            playSound("click", false);
            router.push("/beta");
          }}
          className="p-2 xs:px-3 xs:py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] hover:text-[var(--ink)] transition flex items-center gap-1.5 active:scale-95 cursor-pointer text-xs font-bold shadow-xs"
        >
          <ArrowLeft className={`w-4 h-4 stroke-[2.5] ${locale === "ar" ? "rotate-180" : ""}`} />
          <span>{copy.back}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.main
          key="login-page"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -15 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="w-full max-w-md mx-auto z-10"
        >
          {/* Core Frame with responsive glass container card */}
          <div className="bg-[var(--surface)] backdrop-blur-3xl rounded-3xl border border-[var(--border)] shadow-[0_25px_60px_rgba(15,23,42,0.08),inset_0_1px_2px_rgba(255,255,255,0.7)] overflow-hidden relative">
            
            {/* Floating Action Bell Button */}
            <div className={`absolute top-4 ${locale === "ar" ? "left-4" : "right-4"} z-40`}>
              <button
                type="button"
                onClick={() => {
                  playSound("bell", false);
                  router.push("/notifications");
                }}
                className="relative p-2.5 rounded-full bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)] shadow-xs text-[var(--ink)] hover:text-emerald-600 active:scale-95 transition-all cursor-pointer group flex items-center justify-center"
                title={copy.title}
              >
                <Bell className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Visual Success feedback glass layer overlay */}
            <AnimatePresence>
              {authenticated && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="absolute inset-0 bg-emerald-500/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white z-50 p-6 text-center"
                >
                  <span className="absolute top-1/4 left-1/4 animate-bounce text-emerald-100 opacity-70">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <span
                    className="absolute bottom-1/4 right-1/4 animate-pulse text-emerald-100 opacity-70"
                    style={{ animationDelay: "0.4s" }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </span>

                  <motion.div
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 14,
                      delay: 0.1,
                    }}
                    className="w-20 h-20 bg-[var(--surface)] rounded-full flex items-center justify-center text-emerald-600 shadow-xl mb-4 relative"
                  >
                    <Check className="w-11 h-11 stroke-[3.5]" />
                    <span className="absolute inset-x-[-10px] inset-y-[-10px] rounded-full border-4 border-[var(--border)] animate-ping" />
                  </motion.div>

                  <motion.h3
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl font-black tracking-tight mb-2 text-white drop-shadow-sm"
                  >
                    {copy.accessSecured}
                  </motion.h3>

                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs text-emerald-50/90 font-medium max-w-[240px]"
                  >
                    {copy.welcomeBack}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-5 xs:p-6 sm:p-8">
              {/* Header Area */}
              <div className="flex flex-col items-center text-center mb-6 font-sans">
                {/* Profile Avatar */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-16 h-16 rounded-full bg-[var(--surface)] backdrop-blur-xl border border-[var(--border)] flex items-center justify-center text-[var(--ink)] font-extrabold text-xl mb-3 shadow-[0_4px_12px_rgba(15,23,42,0.03),inset_0_2px_4px_rgba(0,0,0,0.02)] relative group"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 group-hover:scale-110 transition-transform duration-350" />
                  {userName.charAt(0).toUpperCase()}
                </motion.div>

                <h2 className="text-xl font-bold tracking-tight text-[var(--ink)] leading-none">
                  {copy.greeting(userName)}
                </h2>

                <p className="text-xs text-[var(--muted)] font-medium mt-2">
                  {copy.authSubtitle}
                </p>

                {/* Secure Demo PIN indicator */}
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut",
                  }}
                  className="mt-3.5 bg-[var(--surface)] backdrop-blur-md border border-[var(--border)] rounded-xl px-3 py-1 flex items-center gap-1.5 shadow-[0_2px_6px_rgba(0,0,0,0.02)]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-xs text-amber-900 font-semibold tracking-wide">
                    {copy.demoPin}{" "}
                    <span className="font-mono text-[var(--ink)] bg-amber-200/50 px-1.5 py-0.5 rounded text-xs">
                      {userPin}
                    </span>
                  </span>
                </motion.div>
              </div>

              {/* Selector tabs with elegant glass elements */}
              <div className="grid grid-cols-2 gap-2 bg-[var(--surface-2)]/40 backdrop-blur-md p-1 rounded-xl mb-6 border border-[var(--border)] relative">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click", false);
                    setActiveTab("fingerprint");
                    setStatusMessage(null);
                  }}
                  className={`relative flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold z-10 transition-colors ${
                    activeTab === "fingerprint"
                      ? "text-slate-955 font-bold"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {activeTab === "fingerprint" && (
                    <motion.span
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-[var(--surface)] backdrop-blur-md rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[var(--border)]"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                    />
                  )}
                  <Fingerprint className="w-4 h-4 text-emerald-600 relative z-20" />
                  <span className="relative z-20">{copy.tabFingerprint}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click", false);
                    setActiveTab("pin");
                    setStatusMessage(null);
                  }}
                  className={`relative flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold z-10 transition-colors ${
                    activeTab === "pin"
                      ? "text-slate-955 font-bold"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {activeTab === "pin" && (
                    <motion.span
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-[var(--surface)] backdrop-blur-md rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[var(--border)]"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                      }}
                    />
                  )}
                  <Lock className="w-4 h-4 text-emerald-600 relative z-20" />
                  <span className="relative z-20">{copy.tabPin}</span>
                </button>
              </div>

              {/* Container for active selections */}
              <div className="min-h-[220px] flex flex-col justify-center relative">
                <AnimatePresence mode="wait">
                  {activeTab === "fingerprint" ? (
                    <motion.div
                      key="fingerprint"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col items-center py-1"
                    >
                      <div className="relative mb-5">
                        {isScanning && (
                          <>
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0.6 }}
                              animate={{ scale: 1.5, opacity: 0 }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.8,
                                ease: "easeOut",
                              }}
                              className="absolute -inset-4 rounded-full border-2 border-emerald-500/50 bg-emerald-500/5 pointer-events-none"
                            />
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0.6 }}
                              animate={{ scale: 1.5, opacity: 0 }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.8,
                                ease: "easeOut",
                                delay: 0.6,
                              }}
                              className="absolute -inset-4 rounded-full border-2 border-emerald-400/40 bg-emerald-400/5 pointer-events-none"
                            />
                          </>
                        )}

                        <motion.button
                          onMouseDown={handleStartScan}
                          onMouseUp={handleEndScan}
                          onMouseLeave={handleEndScan}
                          onTouchStart={handleStartScan}
                          onTouchEnd={handleEndScan}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.94 }}
                          className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-all bg-gradient-to-b cursor-pointer select-none relative overflow-hidden ${
                            scanSuccess
                              ? "border-emerald-500 from-white/70 to-emerald-50/80 text-emerald-600 shadow-emerald-glow"
                              : isScanning
                                ? "border-teal-500 from-white/70 to-teal-50/80 text-teal-600 shadow-emerald-glow"
                                : "border-[var(--border)] from-white/80 to-white/40 text-[var(--muted)] hover:border-[var(--border)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_4px_12px_rgba(0,0,0,0.02)]"
                          }`}
                          style={{ touchAction: "none" }}
                        >
                          {isScanning && (
                            <motion.div
                              animate={{ y: [0, 84, 0] }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.5,
                                ease: "linear",
                              }}
                              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-400 pointer-events-none z-10"
                              style={{
                                boxShadow:
                                  "0 0 12px #10b981, 0 0 4px #10b981",
                              }}
                            />
                          )}

                          {isScanning ? (
                            <span className="text-sm font-black font-mono text-emerald-600 animate-pulse">
                              {scanProgress}%
                            </span>
                          ) : (
                            <Fingerprint className="w-12 h-12 stroke-[1.6] transition-transform" />
                          )}
                        </motion.button>
                      </div>

                      <div className="text-center w-full px-4 mb-3">
                        <p className="text-xs font-bold text-[var(--muted)] tracking-wide">
                          {isScanning
                            ? copy.scanningMessage
                            : copy.holdFingerMessage}
                        </p>

                        <div className="w-full bg-[var(--surface)] backdrop-blur-xs rounded-full h-1 mt-2.5 overflow-hidden border border-[var(--border)] relative shadow-inner">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status bar */}
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-[var(--surface)] backdrop-blur-md px-3 py-1 rounded-full border border-[var(--border)] shadow-[0_2px_5px_rgba(16,185,129,0.03)] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>{copy.biometricsEnabled}</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pin"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col items-center"
                    >
                      <div
                        className={`flex justify-center items-center gap-4.5 mb-5 h-6 transition-transform ${pinError ? "animate-shake" : ""}`}
                      >
                        {[0, 1, 2, 3].map((pos) => {
                          const filled = enteredPin.length > pos;
                          return (
                            <motion.div
                              key={pos}
                              initial={{ scale: 0.8 }}
                              animate={{
                                scale: filled ? 1.25 : 1,
                                backgroundColor: pinError
                                  ? "#f43f5e"
                                  : filled
                                    ? "#1e293b"
                                    : "rgba(255,255,255,0.1)",
                                borderColor: pinError
                                  ? "#f43f5e"
                                  : filled
                                    ? "#1e293b"
                                    : "rgba(255,255,255,0.9)",
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 15,
                              }}
                              className="w-3.5 h-3.5 rounded-full border border-[var(--border)] shadow-sm"
                            />
                          );
                        })}
                      </div>

                      {/* Keyboard grid */}
                      <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                          (num) => (
                            <motion.button
                              key={num}
                              type="button"
                              onClick={() => handleKeypadPress(num)}
                              whileHover={{ scale: 1.05, y: -0.5 }}
                              whileTap={{ scale: 0.94 }}
                              transition={{
                                type: "spring",
                                stiffness: 450,
                                damping: 18,
                              }}
                              className="h-11 xs:h-12 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)] text-sm xs:text-base font-bold text-[var(--ink)] flex items-center justify-center shadow-xs cursor-pointer backdrop-blur-xs transition-colors"
                            >
                              {num}
                            </motion.button>
                          ),
                        )}

                        <motion.button
                          type="button"
                          onClick={() => {
                            playSound("click", false);
                            setEnteredPin("");
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="h-11 xs:h-12 rounded-xl text-[10px] xs:text-[11px] font-black text-[var(--muted)] hover:text-slate-850 flex items-center justify-center cursor-pointer transition-colors uppercase"
                        >
                          {copy.clear}
                        </motion.button>

                        <motion.button
                          key="0"
                          type="button"
                          onClick={() => handleKeypadPress("0")}
                          whileHover={{ scale: 1.05, y: -0.5 }}
                          whileTap={{ scale: 0.94 }}
                          className="h-11 xs:h-12 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface)] border border-[var(--border)] text-sm xs:text-base font-bold text-[var(--ink)] flex items-center justify-center shadow-xs cursor-pointer backdrop-blur-xs transition-colors"
                        >
                          0
                        </motion.button>

                        <motion.button
                          type="button"
                          onClick={() => {
                            playSound("click", false);
                            setEnteredPin((prev) => prev.slice(0, -1));
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="h-11 xs:h-12 rounded-xl text-[10px] xs:text-[11px] font-black text-[var(--muted)] hover:text-slate-850 flex items-center justify-center cursor-pointer transition-colors uppercase"
                        >
                          {copy.backspace}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notifications feedback alerts */}
              <AnimatePresence>
                {statusMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={`mt-4 text-center text-xs font-semibold ${
                      statusMessage === copy.successAuth || statusMessage === copy.fingerprintSuccess
                        ? "text-emerald-600"
                        : "text-rose-500"
                    }`}
                  >
                    {statusMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Simple wizard section */}
            <div className="bg-[var(--surface)] backdrop-blur-md p-5 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted)] font-medium">
                  {copy.newRoutine}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click", false);
                    setModalName("");
                    setModalPin("");
                    setShowModal(true);
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-extrabold flex items-center gap-0.5 active:scale-95 transition group animate-pulse-slow"
                >
                  <span>{copy.newAccount}</span>
                  <motion.span
                    animate={{ x: [0, 2, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.4,
                      ease: "easeInOut",
                    }}
                  >
                    <ChevronRight className={`w-3.5 h-3.5 ${locale === "ar" ? "rotate-180" : ""}`} />
                  </motion.span>
                </button>
              </div>
            </div>
          </div>
        </motion.main>
      </AnimatePresence>

      {/* Simplified profile configuration dialog modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/15 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ scale: 0.92, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 15, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="bg-[var(--surface)] backdrop-blur-3xl rounded-2xl w-full max-w-sm border border-[var(--border)] p-6 shadow-2xl relative z-10 font-sans"
            >
              <h4 className="text-sm font-extrabold text-[var(--ink)] mb-1">
                {copy.newAccount}
              </h4>
              <p className="text-xs text-[var(--muted)] mb-4 font-normal">
                {copy.newAccountDesc}
              </p>

              <form onSubmit={handleCreateAccountSim} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--muted)] uppercase mb-1.5 tracking-wider">
                    {copy.inputName}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    placeholder={copy.inputNamePlaceholder}
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:bg-[var(--surface)] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-[var(--muted)] uppercase mb-1.5 tracking-wider">
                    {copy.inputPin}
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder={copy.inputPinPlaceholder}
                    value={modalPin}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "");
                      setModalPin(clean);
                    }}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 focus:bg-[var(--surface)] transition"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click", false);
                      setShowModal(false);
                    }}
                    className="flex-1 bg-[var(--surface)] hover:bg-[var(--border)]/55 text-[var(--ink)] text-xs font-bold py-2.5 rounded-xl transition cursor-pointer border border-[var(--border)]"
                  >
                    {copy.btnCancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition hover:opacity-95 active:scale-98 cursor-pointer"
                  >
                    {copy.btnCreate}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
