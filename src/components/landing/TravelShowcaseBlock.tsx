"use client";

import React, { useState } from "react";

const MENU_ITEMS = [
  { label: "HOME", bgIndex: 1 },
  { label: "ABOUT US", bgIndex: 2 },
  { label: "EXPLORE TRIPS", bgIndex: 3 },
  { label: "SERVICES", bgIndex: 4 },
  { label: "CONTACT US", bgIndex: 5 },
];

const BG_IMAGES = [
  { src: "https://ik.imagekit.io/kg2nszxjp/travel-menu/bg-1.webp", tag: "default" },
  { src: "https://ik.imagekit.io/kg2nszxjp/travel-menu/bg-2.webp", tag: "home" },
  { src: "https://ik.imagekit.io/kg2nszxjp/travel-menu/bg-3.webp", tag: "about" },
  { src: "https://ik.imagekit.io/kg2nszxjp/travel-menu/bg-4.webp", tag: "explore" },
  { src: "https://ik.imagekit.io/kg2nszxjp/travel-menu/bg-5.webp", tag: "services" },
  { src: "https://ik.imagekit.io/kg2nszxjp/travel-menu/bg-6.webp", tag: "contact" },
];

export default function TravelShowcaseBlock() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeBg, setActiveBg] = useState(0);

  return (
    <div className="trv-root">
      {/* ==================== MENU OVERLAY ==================== */}
      <div className={`trv-menu-overlay ${isOpen ? "trv-open" : ""}`}>
        {/* Background images */}
        <div className="trv-bg-container" aria-hidden="true">
          {BG_IMAGES.map((img, i) => (
            <div key={img.tag} className="trv-bg-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt=""
                className={activeBg === i ? "trv-bg-active" : ""}
              />
            </div>
          ))}
        </div>

        {/* Menu content */}
        <div className="trv-menu-content">
          <div className="trv-menu-links">
            <div className="trv-menu-main">
              <ul>
                {MENU_ITEMS.map((item) => (
                  <li
                    key={item.label}
                    onMouseEnter={() => setActiveBg(item.bgIndex)}
                    onMouseLeave={() => setActiveBg(0)}
                  >
                    <a href="#hero-section" onClick={() => setIsOpen(false)}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="trv-menu-socials">
              <ul>
                <li><a href="/">Instagram</a></li>
                <li><a href="/">TikTok</a></li>
                <li><a href="/">Facebook</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== NAVBAR ==================== */}
      <header className={`trv-navbar ${isOpen ? "trv-navbar-open" : ""}`}>
        <nav className="trv-wrapper">
          <div className="trv-menu-bar">
            <div className="trv-logo-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://ik.imagekit.io/kg2nszxjp/travel-menu/logo.svg" alt="Travel" />
            </div>

            <button
              type="button"
              className={`trv-menu-toggle ${isOpen ? "trv-toggle-active" : ""}`}
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              <span className="trv-toggle-line-top" />
              <span className="trv-toggle-line-bottom" />
            </button>

            <a href="#hero-section" className="trv-navbar-btn trv-btn">
              <span className="trv-btn-txt">EXPLORE TRIPS</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" fill="none">
                <path
                  fill="#2F2411"
                  d="m17.76 6.857-5.727-5.688a.821.821 0 0 0-1.147.01.81.81 0 0 0-.01 1.139l4.33 4.3H.819a.821.821 0 0 0-.578.238.81.81 0 0 0 .578 1.388h14.389l-4.33 4.3a.813.813 0 0 0-.19.892.813.813 0 0 0 .765.505.824.824 0 0 0 .581-.248l5.727-5.688a.81.81 0 0 0 0-1.148Z"
                />
              </svg>
            </a>
          </div>
        </nav>
      </header>

      {/* ==================== PAGE CONTENT ==================== */}
      <div className={`trv-page-content ${isOpen ? "trv-content-skewed" : ""}`}>
        <section id="hero-section" className="trv-hero-section">
          <div className="trv-wrapper trv-hero-wrapper">
            <h1 className="trv-hero-header">
              Find Your Way to Anywhere in the world
            </h1>

            <div className="trv-hero-cta">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://ik.imagekit.io/kg2nszxjp/travel-menu/accent-element.svg" alt="" />
              <p className="trv-cta-txt">
                From cityscapes to beaches, we guide you. We handle details so you can focus on getting lost in the moment.
              </p>

              <a href="#" className="trv-cta-btn trv-btn">
                <span className="trv-btn-txt">EXPLORE TRIPS</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" fill="none">
                  <path
                    fill="#fff"
                    d="m17.76 6.857-5.727-5.688a.821.821 0 0 0-1.147.01.81.81 0 0 0-.01 1.139l4.33 4.3H.819a.821.821 0 0 0-.578.238.81.81 0 0 0 .578 1.388h14.389l-4.33 4.3a.813.813 0 0 0-.19.892.813.813 0 0 0 .765.505.824.824 0 0 0 .581-.248l5.727-5.688a.81.81 0 0 0 0-1.148Z"
                  />
                </svg>
              </a>
            </div>
          </div>
        </section>

        <section className="trv-spacer-section" />
      </div>

      {/* Scoped CSS strictly encapsulated inside trv-root */}
      <style jsx>{`
        @import url("https://fonts.googleapis.com/css2?family=Anton&family=Mona+Sans:wght@400;600&display=swap");

        .trv-root {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: #17140e;
          font-family: "Mona Sans", sans-serif;
          color: rgba(255, 255, 255, 0.85);
          font-size: 18px;
          line-height: 23px;
          letter-spacing: -0.36px;
        }

        .trv-wrapper {
          max-width: 1440px;
          padding-inline: 2rem;
          margin-inline: auto;
          width: 100%;
        }

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

        .trv-logo-wrapper img {
          height: 38px;
          width: auto;
        }

        .trv-menu-toggle {
          width: 44px;
          height: 44px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 7px;
          align-items: center;
          justify-content: center;
          background: #fff0dc;
          border-radius: 10px;
          cursor: pointer;
          border: none;
          transition: transform 0.2s ease;
        }
        .trv-menu-toggle:hover {
          transform: scale(1.05);
        }

        .trv-menu-toggle span {
          width: 29px;
          height: 2px;
          background: #2f2411;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
        }

        .trv-toggle-active .trv-toggle-line-top {
          transform: translateY(4.5px) rotate(45deg);
        }
        .trv-toggle-active .trv-toggle-line-bottom {
          transform: translateY(-4.5px) rotate(-45deg);
        }

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
          background-color: #ffdcac;
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
          opacity: 1;
          transform: scale(1.1);
        }

        .trv-menu-content {
          width: 100%;
          height: 100%;
        }

        .trv-menu-links {
          background: rgba(29, 20, 4, 0.3);
          backdrop-filter: blur(60px);
          -webkit-backdrop-filter: blur(60px);
          width: 50%;
          min-width: 320px;
          height: 100%;
          padding: 44px 30px;
          display: flex;
          gap: 20px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        @media (max-width: 768px) {
          .trv-menu-links {
            width: 100%;
          }
        }

        .trv-menu-main {
          color: #fff7e8;
          font-family: "Anton", sans-serif;
          font-size: clamp(2rem, 4.86vw + 0.93rem, 5.3rem);
          line-height: 90%;
          letter-spacing: -1.2px;
          width: 100%;
        }

        .trv-menu-main ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .trv-menu-main li {
          margin-bottom: 14px;
          transition: opacity 0.3s ease, transform 0.3s ease;
          width: fit-content;
          margin-inline: auto;
        }

        .trv-menu-main ul:hover li:not(:hover) {
          opacity: 0.45;
        }

        .trv-menu-main a {
          text-decoration: none;
          color: inherit;
          display: inline-block;
          transition: transform 0.2s ease;
        }
        .trv-menu-main a:hover {
          transform: scale(1.05);
        }

        .trv-menu-socials ul {
          display: flex;
          gap: 14px;
          list-style: none;
          padding: 0;
          margin: 0;
          color: #fff7e8;
          font-size: clamp(1rem, 0.55vw + 0.88rem, 1.375rem);
          font-weight: 600;
          letter-spacing: -0.44px;
        }

        .trv-menu-socials a {
          text-decoration: none;
          color: inherit;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .trv-menu-socials a:hover {
          opacity: 1;
        }

        .trv-btn {
          display: inline-flex;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 10px;
          background: #fff0dc;
          font-family: "Anton", sans-serif;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s ease, background-color 0.2s ease;
        }
        .trv-btn:hover {
          transform: translateY(-2px);
        }

        .trv-navbar-btn {
          color: #2f2411;
        }

        .trv-page-content {
          height: 100%;
          will-change: transform;
          transition: transform 0.8s cubic-bezier(0.77, 0, 0.175, 1);
          transform-origin: left top;
        }

        .trv-content-skewed {
          transform: translateY(20%) rotate(18deg) scale(1.3);
        }

        .trv-hero-section {
          background-image: url("https://ik.imagekit.io/kg2nszxjp/travel-menu/home-bg.webp");
          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;
          height: 100vh;
          min-height: 700px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding-block: 36px;
          position: relative;
        }

        .trv-hero-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
        }

        @media (max-width: 900px) {
          .trv-hero-wrapper {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        .trv-hero-header {
          font-family: "Anton", sans-serif;
          font-size: clamp(2.75rem, 7.89vw + 1.02rem, 8.125rem);
          line-height: 99%;
          letter-spacing: -2.6px;
          text-transform: uppercase;
          max-width: 751px;
          background: linear-gradient(0deg, #ffd08e 0%, #fff9ee 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .trv-hero-cta {
          border-radius: 20px;
          background: linear-gradient(
            180deg,
            rgba(23, 20, 14, 0.7) 0%,
            rgba(106, 63, 2, 0.7) 80.77%
          );
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          max-width: 385px;
          padding: 22px 18px;
        }

        .trv-cta-txt {
          margin-block: 12px 14px;
          font-size: 0.95rem;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.9);
        }

        .trv-cta-btn {
          background: #ffad3b;
          color: #fff;
          font-size: 20px;
          width: 100%;
        }

        .trv-spacer-section {
          height: 120px;
          background: #17140e;
        }
      `}</style>
    </div>
  );
}
