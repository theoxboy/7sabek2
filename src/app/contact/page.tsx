"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { apiFetch } from "@/lib/api";
import { readLocaleCookie, FloussyLocale, getLocaleDirection } from "@/lib/localePreference";
import { useForceArabicDocumentFont } from "@/lib/appLocale";

const COPY = {
  fr: {
    backBtn: "Retour à l'accueil",
    backBtnMobile: "Retour",
    badge: "Support Client",
    title: "Besoin d'aide avec votre budget ? Contactez-nous !",
    desc: "Notre équipe est là pour vous accompagner dans l'utilisation de 7sabek.ma et s'assurer que vous tirez le meilleur parti de votre système d'enveloppes. Pour toute question, suggestion ou besoin d'assistance technique, nous sommes à votre écoute.",
    formTitle: "Formulaire de Support",
    labelName: "Nom complet",
    placeholderName: "Ex: Mohamed Alami",
    labelContact: "Contact (Email ou Téléphone)",
    placeholderContact: "Ex: mohamed@email.com ou +212600000000",
    helpContact: "Indiquez votre adresse email ou votre numéro de téléphone avec indicatif.",
    noteAccountExists: "💡 Remarque :",
    noteAccountExistsText: "Un compte est déjà associé à ce contact.",
    loginLink: "Connectez-vous à votre compte",
    loginLinkSuffix: " pour soumettre une demande prioritaire et suivre vos enveloppes.",
    labelSubject: "Sujet de votre demande",
    placeholderSubject: "-- Choisir un sujet --",
    subjectGeneral: "Question générale",
    subjectTech: "Problème technique",
    subjectSuggestion: "Suggestion",
    subjectBug: "Signaler un bug",
    subjectOther: "Autre",
    labelMessage: "Votre Message",
    placeholderMessage: "Décrivez votre demande en détail...",
    btnSend: "Envoyer le message",
    btnSending: "Envoi en cours...",
    directTitle: "Assistance directe",
    directDesc: "Vous pouvez également nous contacter directement par email pour toute autre question :",
    directNote: "*Note : Nous nous efforçons de répondre à toutes les demandes dans un délai de 24 à 48 heures ouvrables.",
    footer: "© 2026 7sabek · Tous droits réservés.",
    
    // Success State
    successTitle: "Message envoyé avec succès !",
    successDesc: "Merci pour votre message. Nous avons bien reçu votre demande d'assistance.",
    successRef: "Référence de votre demande",
    successConfirm: "Un email ou SMS de confirmation vous parviendra sous peu.",
    successAnother: "Envoyer un autre message",
    successHome: "Retourner à l'accueil",

    // Validation Errors
    errName: "Veuillez renseigner votre nom complet.",
    errContactEmpty: "Veuillez renseigner votre email ou votre numéro de téléphone.",
    errContactInvalid: "Veuillez entrer une adresse email valide ou un numéro de téléphone valide.",
    errSubject: "Veuillez sélectionner le sujet de votre demande.",
    errMessageLength: "Votre message doit contenir au moins 10 caractères.",
    errGeneral: "Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.",
  },
  en: {
    backBtn: "Back to Home",
    backBtnMobile: "Back",
    badge: "Customer Support",
    title: "Need help with your budget? Contact us!",
    desc: "Our team is here to support you in using 7sabek.ma and make sure you get the most out of your envelope system. For any questions, suggestions or technical help, we are at your service.",
    formTitle: "Support Form",
    labelName: "Full Name",
    placeholderName: "e.g., Mohamed Alami",
    labelContact: "Contact (Email or Phone)",
    placeholderContact: "e.g., mohamed@email.com or +212600000000",
    helpContact: "Provide your email address or phone number with country code.",
    noteAccountExists: "💡 Note:",
    noteAccountExistsText: "An account is already associated with this contact.",
    loginLink: "Log in to your account",
    loginLinkSuffix: " to submit a priority request and track your envelopes.",
    labelSubject: "Subject of your request",
    placeholderSubject: "-- Choose a subject --",
    subjectGeneral: "General Question",
    subjectTech: "Technical Issue",
    subjectSuggestion: "Suggestion",
    subjectBug: "Report a Bug",
    subjectOther: "Other",
    labelMessage: "Your Message",
    placeholderMessage: "Describe your request in detail...",
    btnSend: "Send Message",
    btnSending: "Sending...",
    directTitle: "Direct Help",
    directDesc: "You can also contact us directly by email for any other question:",
    directNote: "*Note: We strive to reply to all requests within 24 to 48 business hours.",
    footer: "© 2026 7sabek · All rights reserved.",
    
    // Success State
    successTitle: "Message sent successfully!",
    successDesc: "Thank you for your message. We have received your support request.",
    successRef: "Your Request Reference",
    successConfirm: "A confirmation email or SMS will reach you shortly.",
    successAnother: "Send another message",
    successHome: "Go back to Home",

    // Validation Errors
    errName: "Please fill in your full name.",
    errContactEmpty: "Please enter your email or phone number.",
    errContactInvalid: "Please enter a valid email address or phone number.",
    errSubject: "Please select the subject of your request.",
    errMessageLength: "Your message must contain at least 10 characters.",
    errGeneral: "An error occurred while sending your message. Please try again.",
  },
  ar: {
    backBtn: "الرجوع للرئيسية",
    backBtnMobile: "رجوع",
    badge: "دعم الزبناء",
    title: "محتاج مساعدة فالميزانية ديالك؟ اتصل بنا !",
    desc: "الفريق ديالنا هنا باش يعاونك تستعمل 7sabek.ma وتأكد بلي كتستافد مزيان من نظام الأظرفة ديالك. لأي سؤال، اقتراح، أو طلب مساعدة تقنية، حنا ديما فالاستماع.",
    formTitle: "استمارة الدعم والمساعدة",
    labelName: "الاسم الكامل",
    placeholderName: "مثلا: محمد العلمي",
    labelContact: "وسيلة الاتصال (البريد الإلكتروني أو الهاتف)",
    placeholderContact: "مثلا: mohamed@email.com أو +212600000000",
    helpContact: "اكتب البريد الإلكتروني ديالك أو رقم الهاتف مع رمز البلد.",
    noteAccountExists: "💡 ملاحظة :",
    noteAccountExistsText: "كاين حساب مرتبط بهاد معلومات الاتصال.",
    loginLink: "سجل الدخول للحساب ديالك",
    loginLinkSuffix: " باش تصيفط طلب ذو أولوية وتتبع الأظرفة ديالك.",
    labelSubject: "الموضوع ديال الطلب",
    placeholderSubject: "-- اختار موضوع الطلب --",
    subjectGeneral: "سؤال عام",
    subjectTech: "مشكل تقني",
    subjectSuggestion: "اقتراح",
    subjectBug: "تبليغ عن خطأ",
    subjectOther: "موضوع آخر",
    labelMessage: "الرسالة ديالك",
    placeholderMessage: "اشرح الطلب ديالك بالتفصيل...",
    btnSend: "إرسال الرسالة",
    btnSending: "جاري الإرسال...",
    directTitle: "دعم مباشر",
    directDesc: "تقدر كذلك تتصل بنا مباشرة بالبريد الإلكتروني لأي سؤال آخر :",
    directNote: "*ملاحظة: كنحاولو نجاوبو على جميع الطلبات في ظرف 24 إلى 48 ساعة عمل.",
    footer: "© 2026 7sabek · جميع الحقوق محفوظة.",
    
    // Success State
    successTitle: "تم إرسال الرسالة بنجاح !",
    successDesc: "شكراً على رسالتك. توصلنا بطلب المساعدة ديالك.",
    successRef: "رقم المرجع ديال الطلب ديالك",
    successConfirm: "غادي توصل ببريد إلكتروني أو رسالة نصية لتأكيد الاستلام قريباً.",
    successAnother: "إرسال رسالة أخرى",
    successHome: "الرجوع للرئيسية",

    // Validation Errors
    errName: "المرجو كتابة الاسم الكامل ديالك.",
    errContactEmpty: "المرجو كتابة البريد الإلكتروني أو رقم الهاتف.",
    errContactInvalid: "المرجو كتابة بريد إلكتروني صحيح أو رقم هاتف صحيح.",
    errSubject: "المرجو اختيار موضوع الطلب ديالك.",
    errMessageLength: "الرسالة ديالك خاص يكون فيها على الأقل 10 ديال الحروف.",
    errGeneral: "وقع خطأ فإرسال الرسالة ديالك. المرجو إعادة المحاولة.",
  }
};

export default function ContactPage() {
  const [locale, setLocale] = useState<FloussyLocale>("fr");
  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketRef, setTicketRef] = useState("");
  
  const [accountExists, setAccountExists] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);

  // Load language settings from user preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      let activeLocale: FloussyLocale = "fr";

      // 1. Check locale preference cookie
      const cookieLocale = readLocaleCookie(document.cookie);
      if (cookieLocale) {
        activeLocale = cookieLocale;
      } else {
        // 2. Check local storage preference
        const storedLocale = window.localStorage.getItem("floussy_locale_pref");
        if (storedLocale && (storedLocale === "ar" || storedLocale === "en" || storedLocale === "fr")) {
          activeLocale = storedLocale as FloussyLocale;
        } else {
          // 3. Fallback to document language attribute
          const htmlLang = document.documentElement.lang;
          if (htmlLang === "ar" || htmlLang === "en" || htmlLang === "fr") {
            activeLocale = htmlLang as FloussyLocale;
          }
        }
      }

      setLocale(activeLocale);

      // Apply language and text direction to HTML document
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = getLocaleDirection(activeLocale);
    }
  }, []);

  const copy = COPY[locale];
  const dir = getLocaleDirection(locale);
  const isArabic = locale === "ar";
  useForceArabicDocumentFont(isArabic, "contact-page-arabic-font");

  // Debounced check for existing account
  useEffect(() => {
    const cleanContact = contactInfo.trim();
    if (!cleanContact) {
      setAccountExists(false);
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanContact);
    const isPhone = /^\+?[0-9\s\-()]{6,20}$/.test(cleanContact);
    
    if (!isEmail && !isPhone) {
      setAccountExists(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingAccount(true);
      try {
        const res = await apiFetch<{ exists: boolean }>(
          `/public/check-account?contact=${encodeURIComponent(cleanContact)}`
        );
        setAccountExists(res.exists);
      } catch {
        setAccountExists(false);
      } finally {
        setCheckingAccount(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [contactInfo]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!fullName.trim()) {
      setError(copy.errName);
      return;
    }
    if (!contactInfo.trim()) {
      setError(copy.errContactEmpty);
      return;
    }
    
    // Check if valid email or phone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.trim());
    const isPhone = /^\+?[0-9\s\-()]{6,20}$/.test(contactInfo.trim());
    if (!isEmail && !isPhone) {
      setError(copy.errContactInvalid);
      return;
    }

    if (!subject) {
      setError(copy.errSubject);
      return;
    }
    if (message.trim().length < 10) {
      setError(copy.errMessageLength);
      return;
    }

    setLoading(true);

    apiFetch<{ ticket_ref: string }>("/public/contact", {
      method: "POST",
      body: {
        full_name: fullName,
        contact_info: contactInfo,
        subject: subject,
        message: message,
      },
    })
      .then((res) => {
        setLoading(false);
        setSuccess(true);
        setTicketRef(res.ticket_ref);
      })
      .catch((err) => {
        setLoading(false);
        const detail = err instanceof Error ? err.message : copy.errGeneral;
        setError(detail);
      });
  };

  const handleReset = () => {
    setFullName("");
    setContactInfo("");
    setSubject("");
    setMessage("");
    setSuccess(false);
    setError(null);
    setTicketRef("");
  };

  return (
    <div
      dir={dir}
      lang={locale}
      className="min-h-screen bg-slate-50/50 text-slate-800 relative overflow-hidden"
      style={isArabic ? { fontFamily: "var(--font-cairo), sans-serif" } : { fontFamily: "var(--font-manrope), sans-serif" }}
    >
      {/* Background gradients for premium aesthetic */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-100/30 blur-3xl" />
        <div className="absolute top-1/3 right-10 h-[600px] w-[600px] rounded-full bg-blue-50/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="transition hover:opacity-90">
            <BrandLogo locale={locale} className="h-14 w-auto sm:h-16" priority />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-emerald-600 shadow-sm"
          >
            <ArrowLeft size={16} className={isArabic ? "scale-x-[-1]" : ""} />
            <span className="hidden sm:inline">{copy.backBtn}</span>
            <span className="sm:hidden">{copy.backBtnMobile}</span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
        {/* Title / Hero section */}
        <div className={`mb-10 text-center ${isArabic ? "sm:text-right" : "sm:text-left"}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-100 mb-4">
            <MessageSquare size={14} className={isArabic ? "scale-x-[-1]" : ""} />
            {copy.badge}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-tight">
            {copy.title}
          </h1>
          <p className="mt-2 text-base font-medium text-emerald-600">7sabek.ma</p>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl">
            {copy.desc}
          </p>
        </div>

        {/* Content container */}
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 md:p-12">
          {success ? (
            /* Premium Success State */
            <div className="text-center py-10 px-4 space-y-6 max-w-lg mx-auto animate-fade-in">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-650 border border-emerald-100 shadow-sm">
                <CheckCircle2 size={48} className="text-emerald-600 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-950">{copy.successTitle}</h2>
                <p className="text-slate-650 text-sm leading-relaxed">
                  {copy.successDesc}
                </p>
              </div>
              
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{copy.successRef}</p>
                <code className="text-lg font-mono font-bold text-slate-800">{ticketRef}</code>
                <p className="text-xs text-slate-550 pt-2 border-t border-slate-200/60">
                  {copy.successConfirm}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                >
                  {copy.successAnother}
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition shadow-sm"
                >
                  {copy.successHome}
                </Link>
              </div>
            </div>
          ) : (
            /* Support Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2 border-b border-slate-150 pb-3">{copy.formTitle}</h2>

              {error && (
                <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200/60 p-4 text-sm text-red-950">
                  <AlertCircle className="mt-0.5 text-red-650 shrink-0" size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="block text-sm font-bold text-slate-800">
                    {copy.labelName}
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder={copy.placeholderName}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contactInfo" className="block text-sm font-bold text-slate-800">
                    {copy.labelContact}
                  </label>
                  <input
                    id="contactInfo"
                    type="text"
                    required
                    placeholder={copy.placeholderContact}
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 text-left"
                    dir="ltr"
                  />
                  <p className="text-xs text-slate-500 italic">
                    {copy.helpContact}
                  </p>
                  {accountExists && (
                    <div className="mt-2.5 flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900 leading-relaxed shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                      <span className="font-semibold text-amber-700 shrink-0">{copy.noteAccountExists}</span>
                      <div>
                        {copy.noteAccountExistsText}{" "}
                        <Link href="/login" className="font-bold underline text-amber-800 hover:text-amber-950">
                          {copy.loginLink}
                        </Link>{" "}
                        {copy.loginLinkSuffix}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="block text-sm font-bold text-slate-800">
                  {copy.labelSubject}
                </label>
                <div className="relative">
                  <select
                    id="subject"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%25.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.7em_auto] bg-no-repeat ${isArabic ? "bg-[left_1rem_center] pr-4 pl-10" : "bg-[right_1rem_center] pl-4 pr-10"}`}
                  >
                    <option value="" disabled>{copy.placeholderSubject}</option>
                    <option value={copy.subjectGeneral}>{copy.subjectGeneral}</option>
                    <option value={copy.subjectTech}>{copy.subjectTech}</option>
                    <option value={copy.subjectSuggestion}>{copy.subjectSuggestion}</option>
                    <option value={copy.subjectBug}>{copy.subjectBug}</option>
                    <option value={copy.subjectOther}>{copy.subjectOther}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-bold text-slate-800">
                  {copy.labelMessage}
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  placeholder={copy.placeholderMessage}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 resize-y min-h-[120px]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none sm:w-auto"
                >
                  {loading ? (
                    <>
                      <svg className={`animate-spin h-5 w-5 text-white ${isArabic ? "ml-3" : "-ml-1 mr-3"}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {copy.btnSending}
                    </>
                  ) : (
                    <>
                      <Send size={16} className={isArabic ? "scale-x-[-1]" : ""} />
                      {copy.btnSend}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <hr className="border-slate-100 my-8" />

          {/* Assistance Directe Section */}
          <div className="rounded-2xl bg-emerald-50/30 border border-emerald-100/60 p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="text-emerald-600" size={20} />
              {copy.directTitle}
            </h3>
            <p className="text-slate-650 text-sm leading-relaxed">
              {copy.directDesc}
            </p>
            <div className={`flex items-center gap-2.5 ${isArabic ? "flex-row-reverse justify-end" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-650">
                <Mail size={18} />
              </div>
              <a
                href="mailto:Support@7sabek.ma"
                className="text-base font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                dir="ltr"
              >
                Support@7sabek.ma
              </a>
            </div>
            <p className="text-xs text-slate-500 italic pt-2 border-t border-slate-200/50">
              {copy.directNote}
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mb-3 flex justify-center">
          <BrandLogo locale={locale} className="h-12 w-auto grayscale opacity-60" />
        </div>
        <p>{copy.footer}</p>
      </footer>
    </div>
  );
}
