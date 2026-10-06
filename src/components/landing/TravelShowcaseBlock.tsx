"use client";

import React, { useState } from "react";
import Link from "next/link";

interface MenuItem {
  labelAr: string;
  labelFr: string;
  bgIndex: number;
  href: string;
}

const MENU_ITEMS: MenuItem[] = [
  { labelAr: "الرئيسية", labelFr: "ACCUEIL", bgIndex: 1, href: "#top" },
  { labelAr: "طريقة الأظرفة", labelFr: "MÉTHODE SMART", bgIndex: 2, href: "#method" },
  { labelAr: "المستشار با عمر", labelFr: "CONSEILLER IA", bgIndex: 3, href: "#ai-advisor" },
  { labelAr: "مميزات التطبيق", labelFr: "FONCTIONNALITÉS", bgIndex: 4, href: "#features" },
  { labelAr: "تسجيل الدخول", labelFr: "CONNEXION", bgIndex: 5, href: "/login" },
];

const BG_IMAGES = [
  // 0: Default financial hero atmosphere
  {
    src: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=2000&q=85",
    tag: "default",
    title: "تدبير ذكي للأموال والميزانية",
  },
  // 1: Home / Vision
  {
    src: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=2000&q=85",
    tag: "home",
    title: "الوضوح المالي والنمو",
  },
  // 2: Envelopes Method
  {
    src: "https://images.unsplash.com/photo-1607863680198-23d4b2565df0?auto=format&fit=crop&w=2000&q=85",
    tag: "envelopes",
    title: "نظام أظرفة الميزانية",
  },
  // 3: Ba Omar AI
  {
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=85",
    tag: "advisor",
    title: "ذكاء اصطناعي مغربي",
  },
  // 4: Features
  {
    src: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=2000&q=85",
    tag: "security",
    title: "أمان وحماية قصوى",
  },
  // 5: Get Started
  {
    src: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=2000&q=85",
    tag: "start",
    title: "استقلال وحرية مالية",
  },
];

export default function TravelShowcaseBlock() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeBg, setActiveBg] = useState(0);

  return (
    <div className="trv-root" dir="rtl">
      {/* ==================== MENU OVERLAY (FLUID CLIP-PATH) ==================== */}
      <div className={`trv-menu-overlay ${isOpen ? "trv-open" : ""}`} aria-hidden={!isOpen}>
        {/* Background images with blur filter and subtle scale transition */}
        <div className="trv-bg-container" aria-hidden="true">
          {BG_IMAGES.map((img, i) => (
            <div key={img.tag} className="trv-bg-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                className={activeBg === i ? "trv-bg-active" : ""}
                loading="lazy"
              />
            </div>
          ))}
          {/* Frosted ambient glass blur overlay on menu images */}
          <div className="trv-bg-blur-layer" />
        </div>

        {/* Menu content panel with glassmorphism blur */}
        <div className="trv-menu-content">
          <div className="trv-menu-links">
            <div className="trv-menu-badge">
              <span>✦ نظام الميزانية الذكية بالمغرب</span>
            </div>

            <div className="trv-menu-main">
              <ul>
                {MENU_ITEMS.map((item) => (
                  <li
                    key={item.labelAr}
                    onMouseEnter={() => setActiveBg(item.bgIndex)}
                    onMouseLeave={() => setActiveBg(0)}
                  >
                    <a
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="trv-menu-link-item"
                    >
                      <span className="trv-link-ar">{item.labelAr}</span>
                      <span className="trv-link-fr">{item.labelFr}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="trv-menu-footer">
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="trv-menu-cta-btn"
              >
                <span>ابدأ دابا فابور (100% مجاني)</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" fill="none" viewBox="0 0 18 14">
                  <path fill="currentColor" d="m17.76 6.857-5.727-5.688a.821.821 0 0 0-1.147.01.81.81 0 0 0-.01 1.139l4.33 4.3H.819a.821.821 0 0 0-.578.238.81.81 0 0 0 .578 1.388h14.389l-4.33 4.3a.813.813 0 0 0-.19.892.813.813 0 0 0 .765.505.824.824 0 0 0 .581-.248l5.727-5.688a.81.81 0 0 0 0-1.148Z" />
                </svg>
              </Link>
              <div className="trv-menu-socials">
                <a href="#top" onClick={() => setIsOpen(false)}>7sabek.ma</a>
                <span>•</span>
                <Link href="/login" onClick={() => setIsOpen(false)}>Connexion</Link>
                <span>•</span>
                <Link href="/register" onClick={() => setIsOpen(false)}>Créer un compte</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== NAVBAR ==================== */}
      <header className={`trv-navbar ${isOpen ? "trv-navbar-open" : ""}`}>
        <nav className="trv-wrapper">
          <div className="trv-menu-bar">
            {/* 7sabek Brand Logo */}
            <Link href="#top" className="trv-logo-link" aria-label="7sabek">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-fr-en.png"
                alt="7sabek"
                className="trv-brand-img"
              />
            </Link>

            {/* Menu Hamburger Toggle */}
            <button
              type="button"
              className={`trv-menu-toggle ${isOpen ? "trv-toggle-active" : ""}`}
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <span className="trv-toggle-line-top" />
              <span className="trv-toggle-line-bottom" />
            </button>

            {/* Direct CTA button to register */}
            <Link href="/register" className="trv-navbar-btn trv-btn">
              <span className="trv-btn-txt">ابدأ دابا فابور</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="14" fill="none" viewBox="0 0 18 14">
                <path
                  fill="currentColor"
                  d="m17.76 6.857-5.727-5.688a.821.821 0 0 0-1.147.01.81.81 0 0 0-.01 1.139l4.33 4.3H.819a.821.821 0 0 0-.578.238.81.81 0 0 0 .578 1.388h14.389l-4.33 4.3a.813.813 0 0 0-.19.892.813.813 0 0 0 .765.505.824.824 0 0 0 .581-.248l5.727-5.688a.81.81 0 0 0 0-1.148Z"
                />
              </svg>
            </Link>
          </div>
        </nav>
      </header>

      {/* ==================== PAGE CONTENT ==================== */}
      <div className={`trv-page-content ${isOpen ? "trv-content-skewed" : ""}`}>
        <section id="hero-showcase-section" className="trv-hero-section">
          {/* Frosted Glass Layer over Hero Background Photo */}
          <div className="trv-hero-blur-overlay" aria-hidden="true" />

          <div className="trv-wrapper trv-hero-wrapper">
            {/* Main Punchy Financial Title */}
            <div className="trv-hero-title-group">
              <div className="trv-hero-pill">
                <span className="trv-pill-dot" />
                <span>نظام الميزانية والأظرفة الذكية بالمغرب</span>
              </div>
              <h1 className="trv-hero-header">
                تحكم ففلوسك.. ماشي هي اللي تحكم فيك
              </h1>
              <p className="trv-hero-subtitle">
                كل درهم كيدخل وكيخرج كتعرف بلاصتو. وضوح تام، انضباط مالي، وتوفير حقيقي كل شهر.
              </p>
            </div>

            {/* Frosted Glass Floating CTA Box */}
            <div className="trv-hero-cta">
              <div className="trv-cta-header">
                <div className="trv-cta-icon-wrap">
                  <span className="trv-cta-badge-tag">🇲🇦 مصمم للمغرب</span>
                </div>
                <div className="trv-cta-stat">
                  <strong>+100%</strong>
                  <span>فابور وشفاف</span>
                </div>
              </div>

              <p className="trv-cta-txt">
                مع 7sabek، كتفرق ميزانيتك لأظرفة واضحة (الكراء، التقدية، الطوارئ، التوفير) وكتعرف شحال تصرف كل نهار بلا ستريس.
              </p>

              <div className="trv-cta-actions">
                <Link href="/register" className="trv-cta-btn trv-btn">
                  <span className="trv-btn-txt">افتح حسابك مجاناً</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" fill="none" viewBox="0 0 18 14">
                    <path
                      fill="#fff"
                      d="m17.76 6.857-5.727-5.688a.821.821 0 0 0-1.147.01.81.81 0 0 0-.01 1.139l4.33 4.3H.819a.821.821 0 0 0-.578.238.81.81 0 0 0 .578 1.388h14.389l-4.33 4.3a.813.813 0 0 0-.19.892.813.813 0 0 0 .765.505.824.824 0 0 0 .581-.248l5.727-5.688a.81.81 0 0 0 0-1.148Z"
                    />
                  </svg>
                </Link>

                <Link href="/login" className="trv-cta-secondary-link">
                  عندك حساب ديجا؟ <strong>تسجيل الدخول</strong>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="trv-spacer-section" />
      </div>

      {/* Scoped CSS with Rich Glassmorphism & Flous/Finance Theme */}
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Anton&display=swap");

        .trv-root {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: #061812;
          font-family: "Cairo", system-ui, -apple-system, sans-serif;
          color: rgba(255, 255, 255, 0.92);
          font-size: 17px;
          line-height: 1.5;
        }

        .trv-wrapper {
          max-width: 1400px;
          padding-inline: 2rem;
          margin-inline: auto;
          width: 100%;
        }

        @media (max-width: 640px) {
          .trv-wrapper {
            padding-inline: 1.25rem;
          }
        }

        /* ================= NAVBAR ================= */
        .trv-navbar {
          position: absolute;
          top: 18px;
          left: 0;
          width: 100%;
          z-index: 1000;
          pointer-events: none;
        }

        .trv-navbar.trv-navbar-open {
          position: fixed;
          z-index: 10000;
        }

        .trv-menu-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: auto;
        }

        .trv-logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .trv-brand-img {
          height: 48px;
          width: auto;
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
        }

        .trv-menu-toggle {
          width: 46px;
          height: 46px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.2);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(52, 211, 153, 0.35);
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        .trv-menu-toggle:hover {
          transform: scale(1.06);
          background: rgba(16, 185, 129, 0.35);
          border-color: rgba(52, 211, 153, 0.6);
        }

        .trv-menu-toggle span {
          width: 26px;
          height: 2.5px;
          background: #e6fffa;
          border-radius: 2px;
          transition: transform 0.35s cubic-bezier(0.68, -0.6, 0.32, 1.6);
        }

        .trv-menu-toggle.trv-toggle-active .trv-toggle-line-top {
          transform: translateY(4.25px) rotate(45deg);
          background: #34d399;
        }

        .trv-menu-toggle.trv-toggle-active .trv-toggle-line-bottom {
          transform: translateY(-4.25px) rotate(-45deg);
          background: #34d399;
        }

        .trv-btn {
          display: inline-flex;
          gap: 10px;
          padding: 12px 22px;
          border-radius: 12px;
          font-weight: 700;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .trv-btn:hover {
          transform: translateY(-2px);
        }

        .trv-navbar-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);
          font-size: 15px;
        }

        .trv-navbar-btn:hover {
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.5);
        }

        /* ================= MENU OVERLAY ================= */
        .trv-menu-overlay {
          position: fixed;
          inset: 0;
          height: 100vh;
          width: 100vw;
          z-index: 9998;
          clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
          pointer-events: none;
          transition: clip-path 0.8s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .trv-menu-overlay.trv-open {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          pointer-events: auto;
        }

        .trv-bg-container {
          background-color: #04140f;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: -1;
        }

        .trv-bg-img img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transform: scale(1);
          transition: opacity 0.5s ease-in-out, transform 0.7s ease-out;
        }

        .trv-bg-img img.trv-bg-active {
          opacity: 0.85;
          transform: scale(1.08);
        }

        /* Frosted Glass Ambient Blur over the Menu background photos */
        .trv-bg-blur-layer {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 50%, rgba(16, 185, 129, 0.25) 0%, rgba(4, 15, 11, 0.88) 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .trv-menu-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        .trv-menu-links {
          background: rgba(4, 20, 15, 0.65);
          backdrop-filter: blur(50px) saturate(160%);
          -webkit-backdrop-filter: blur(50px) saturate(160%);
          border-left: 1px solid rgba(52, 211, 153, 0.2);
          width: 52%;
          min-width: 340px;
          height: 100%;
          padding: 60px 48px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          text-align: right;
          box-shadow: -20px 0 60px rgba(0, 0, 0, 0.5);
        }

        @media (max-width: 860px) {
          .trv-menu-links {
            width: 100%;
            padding: 40px 24px;
            border-left: none;
          }
        }

        .trv-menu-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(52, 211, 153, 0.35);
          color: #34d399;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        .trv-menu-main {
          width: 100%;
        }

        .trv-menu-main ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .trv-menu-main li {
          margin-bottom: 12px;
          transition: opacity 0.3s ease, transform 0.3s ease;
          width: fit-content;
        }

        .trv-menu-main ul:hover li:not(:hover) {
          opacity: 0.4;
        }

        .trv-menu-link-item {
          text-decoration: none;
          color: #f0fdf4;
          display: flex;
          align-items: baseline;
          gap: 16px;
          transition: transform 0.2s ease, color 0.2s ease;
        }

        .trv-menu-link-item:hover {
          transform: translateX(-10px);
          color: #34d399;
        }

        .trv-link-ar {
          font-size: clamp(2rem, 3.8vw + 0.8rem, 3.75rem);
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.5px;
        }

        .trv-link-fr {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #6ee7b7;
          opacity: 0.7;
          font-family: system-ui, sans-serif;
        }

        .trv-menu-footer {
          margin-top: 32px;
          width: 100%;
        }

        .trv-menu-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 28px;
          border-radius: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 16px;
          text-decoration: none;
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .trv-menu-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 38px rgba(16, 185, 129, 0.55);
        }

        .trv-menu-socials {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 18px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }

        .trv-menu-socials a {
          color: #a7f3d0;
          text-decoration: none;
          transition: color 0.2s;
        }

        .trv-menu-socials a:hover {
          color: #ffffff;
        }

        /* ================= PAGE CONTENT & HERO ================= */
        .trv-page-content {
          height: 100%;
          will-change: transform;
          transition: transform 0.8s cubic-bezier(0.77, 0, 0.175, 1);
          transform-origin: right top;
        }

        .trv-content-skewed {
          transform: translateY(20%) rotate(-14deg) scale(1.25);
        }

        .trv-hero-section {
          background-image: url("https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=2200&q=85");
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          height: 100vh;
          min-height: 720px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-block: 48px;
          position: relative;
        }

        /* Ambient Glassmorphism Blur Filter over Hero Image */
        .trv-hero-blur-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 30%, rgba(16, 185, 129, 0.22) 0%, transparent 60%),
                      linear-gradient(180deg, rgba(6, 24, 18, 0.55) 0%, rgba(4, 18, 13, 0.92) 100%);
          backdrop-filter: blur(6px) saturate(130%);
          -webkit-backdrop-filter: blur(6px) saturate(130%);
          pointer-events: none;
          z-index: 1;
        }

        .trv-hero-wrapper {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 36px;
        }

        @media (max-width: 980px) {
          .trv-hero-wrapper {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        .trv-hero-title-group {
          max-width: 780px;
        }

        .trv-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.18);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(52, 211, 153, 0.4);
          color: #6ee7b7;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        }

        .trv-pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 10px #34d399;
        }

        .trv-hero-header {
          font-family: "Cairo", sans-serif;
          font-size: clamp(2.6rem, 5.8vw + 1rem, 5.25rem);
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -1px;
          margin: 0;
          background: linear-gradient(135deg, #ffffff 20%, #a7f3d0 70%, #fde047 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
        }

        .trv-hero-subtitle {
          margin-top: 18px;
          font-size: clamp(1rem, 1.2vw + 0.6rem, 1.35rem);
          color: rgba(220, 252, 231, 0.88);
          max-width: 650px;
          line-height: 1.6;
          font-weight: 500;
        }

        /* Glassmorphism Floating CTA Box with Blur */
        .trv-hero-cta {
          border-radius: 24px;
          background: rgba(6, 24, 18, 0.68);
          backdrop-filter: blur(24px) saturate(170%);
          -webkit-backdrop-filter: blur(24px) saturate(170%);
          border: 1px solid rgba(52, 211, 153, 0.28);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2);
          max-width: 420px;
          width: 100%;
          padding: 26px 24px;
          z-index: 2;
        }

        .trv-cta-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .trv-cta-badge-tag {
          font-size: 13px;
          font-weight: 700;
          color: #fef08a;
          background: rgba(234, 179, 8, 0.15);
          border: 1px solid rgba(250, 204, 21, 0.3);
          padding: 4px 10px;
          border-radius: 8px;
        }

        .trv-cta-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.1;
        }

        .trv-cta-stat strong {
          color: #34d399;
          font-size: 18px;
        }

        .trv-cta-stat span {
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
        }

        .trv-cta-txt {
          margin-block: 12px 18px;
          font-size: 0.95rem;
          line-height: 1.6;
          color: rgba(240, 253, 244, 0.88);
        }

        .trv-cta-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trv-cta-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          font-size: 17px;
          font-weight: 800;
          width: 100%;
          padding: 14px 20px;
          border-radius: 14px;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .trv-cta-btn:hover {
          box-shadow: 0 12px 30px rgba(16, 185, 129, 0.6);
        }

        .trv-cta-secondary-link {
          text-align: center;
          font-size: 13px;
          color: rgba(220, 252, 231, 0.75);
          text-decoration: none;
          padding-top: 4px;
          transition: color 0.2s ease;
        }

        .trv-cta-secondary-link strong {
          color: #6ee7b7;
          text-decoration: underline;
        }

        .trv-cta-secondary-link:hover {
          color: #ffffff;
        }

        .trv-spacer-section {
          height: 100px;
          background: #061812;
        }
      `}</style>
    </div>
  );
}
