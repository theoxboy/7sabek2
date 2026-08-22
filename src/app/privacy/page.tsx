"use client";

import Link from "next/link";
import { ArrowLeft, Lock, FileText, UserCheck, Cpu, Database, Share2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800">
      {/* Background gradients for premium aesthetic */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-100/30 blur-3xl" />
        <div className="absolute top-1/3 right-10 h-[600px] w-[600px] rounded-full bg-blue-50/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="transition hover:opacity-90">
            <BrandLogo locale="fr" className="h-14 w-auto sm:h-16" priority />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-emerald-600 shadow-sm"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Retour à l'accueil</span>
            <span className="sm:hidden">Retour</span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
        {/* Title / Hero section */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-100 mb-4">
            <FileText size={14} />
            Documents Légaux
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Politique de Confidentialité
          </h1>
          <p className="mt-2 text-base font-medium text-emerald-600">7sabek.ma</p>
          
          <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-500 border-t border-slate-200/60 pt-4">
            <div>Dernière mise à jour : <span className="text-slate-800 font-semibold">8 juin 2026</span></div>
          </div>
        </div>

        {/* Content container */}
        <div className="space-y-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 md:p-12">
          
          <p className="text-sm sm:text-base leading-relaxed text-slate-600">
            La protection de vos données personnelles et de votre vie privée est au cœur de nos priorités. Cette Politique de Confidentialité explique comment <strong className="text-slate-900">7sabek.ma</strong> collecte, utilise et protège vos informations.
          </p>

          <hr className="border-slate-100" />

          {/* 1. Données collectées */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Database size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">1. Données collectées</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Dans le cadre de l'utilisation de notre plateforme et de nos services d'assistance, nous collectons les informations suivantes :
              </p>
              <ul className="space-y-3">
                <li>
                  <strong className="text-slate-800">Données de compte et de contact :</strong> Lors de votre inscription ou lorsque vous utilisez notre formulaire de contact, nous collectons votre nom et vos coordonnées. Le système permet de renseigner soit votre <strong className="text-slate-900">adresse email</strong>, soit votre <strong className="text-slate-900">numéro de téléphone</strong>. Ces informations sont utilisées exclusivement pour vous identifier et vous recontacter afin de répondre efficacement à vos demandes d'assistance.
                </li>
                <li>
                  <strong className="text-slate-800">Données financières déclaratives :</strong> Les informations que vous saisissez volontairement dans l'application pour gérer votre budget (montants, noms des enveloppes, catégories de dépenses). <strong className="text-amber-850">Rappel :</strong> 7sabek.ma n'est connecté à aucune banque. Toutes les données sont déclaratives et saisies par vous-même.
                </li>
                <li>
                  <strong className="text-slate-800">Données de navigation :</strong> Des informations techniques de base (type de navigateur, adresse IP) pour des raisons de sécurité et d'amélioration du service.
                </li>
              </ul>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 2. Utilisation de vos données */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Cpu size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">2. Utilisation de vos données</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Vos informations sont utilisées exclusivement pour :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Créer et sécuriser votre accès à l'application.</li>
                <li>Faire fonctionner les algorithmes de répartition de votre budget par enveloppes.</li>
                <li>Répondre à vos questions via notre support client.</li>
                <li>Détecter et bloquer toute tentative de piratage ou d'activité frauduleuse.</li>
              </ul>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 3. Partage et revente de données */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Share2 size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">3. Partage et revente de données</h2>
            </div>
            <div className="text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p className="font-semibold text-slate-900">
                Nous ne vendons, ne louons, ni ne partageons vos données personnelles avec des tiers.
              </p>
              <p className="mt-2">
                Vos informations financières et personnelles restent strictement confidentielles et confinées à l'écosystème sécurisé de 7sabek.ma.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 4. Sécurité des informations */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">4. Sécurité des informations</h2>
            </div>
            <div className="text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Nous mettons en place des mesures de sécurité techniques et organisationnelles robustes pour protéger vos données. Nos communications sont chiffrées et nos bases de données sont protégées par des mécanismes anti-intrusion stricts et des boucliers de sécurité proactifs.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 5. Vos droits */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <UserCheck size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">5. Vos droits</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Vous gardez le contrôle total sur vos données. Vous avez le droit :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>D'accéder aux données que nous possédons sur vous.</li>
                <li>De modifier et mettre à jour vos informations directement depuis votre profil.</li>
                <li>De demander la suppression définitive de votre compte et de toutes les données associées.</li>
              </ul>
              <p className="pt-2">
                Pour exercer ces droits, contactez-nous à :{" "}
                <a href="mailto:Support@7sabek.ma" className="text-emerald-600 font-semibold hover:underline">
                  Support@7sabek.ma
                </a>.
              </p>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mb-3 flex justify-center">
          <BrandLogo locale="fr" className="h-12 w-auto grayscale opacity-60" />
        </div>
        <p>© 2026 7sabek · Tous droits réservés.</p>
      </footer>
    </div>
  );
}
