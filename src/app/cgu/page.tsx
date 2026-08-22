"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Lock, Scale, FileText, UserCheck, ShieldAlert, Cpu, HelpCircle, CheckCircle, RefreshCw } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function CGUPage() {
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
            Conditions Générales d'Utilisation
          </h1>
          <p className="mt-2 text-base font-medium text-emerald-600">7sabek.ma</p>
          
          <div className="mt-6 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-slate-500 border-t border-slate-200/60 pt-4">
            <div>Date d'entrée en vigueur : <span className="text-slate-800 font-semibold">8 juin 2026</span></div>
            <div className="hidden sm:block text-slate-300">•</div>
            <div>Dernière mise à jour : <span className="text-slate-800 font-semibold">8 juin 2026</span></div>
          </div>
        </div>

        {/* CGU content container */}
        <div className="space-y-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 md:p-12">
          
          {/* Préambule et Définitions */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FileText size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">1. Préambule et Définitions</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Les présentes Conditions Générales d'Utilisation (ci-après les « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles l'éditeur met à la disposition de ses utilisateurs l'application multilingue <strong>7sabek.ma</strong>, et les conditions dans lesquelles les utilisateurs accèdent et utilisent ce service.
              </p>
              <p>
                Dans le cadre des présentes CGU, les termes suivants ont la signification ci-après :
              </p>
              <ul className="space-y-2 mt-2">
                <li>
                  <strong className="text-slate-800">« Application » :</strong> désigne la plateforme web et mobile 7sabek.ma, ses modules de transactions, ses algorithmes de répartition et l'ensemble de ses fonctionnalités.
                </li>
                <li>
                  <strong className="text-slate-800">« Éditeur » :</strong> désigne le propriétaire exclusif et gestionnaire de la plateforme 7sabek.ma.
                </li>
                <li>
                  <strong className="text-slate-800">« Utilisateur » :</strong> désigne toute personne physique majeure ayant créé un compte et utilisant l'Application.
                </li>
                <li>
                  <strong className="text-slate-800">« Données » :</strong> désigne l'ensemble des informations nominatives, financières, et de configuration saisies par l'Utilisateur.
                </li>
              </ul>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Description Détaillée des Services */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Cpu size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">2. Description Détaillée des Services</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                <strong>7sabek.ma</strong> est un logiciel en tant que service (SaaS) multilingue dédié à la gestion financière personnelle. Les services incluent, sans s'y limiter :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>La création et la configuration d'un budget basé sur le système des enveloppes virtuelles.</li>
                <li>L'enregistrement manuel et le suivi détaillé des transactions (revenus et dépenses).</li>
                <li>Des modules de répartition automatisée des fonds entre différentes catégories définies par l'Utilisateur.</li>
                <li>La visualisation de rapports et d'analyses financières via des interfaces et tableaux de bord interactifs au design minimaliste.</li>
              </ul>
              <div className="mt-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 p-4 text-amber-800 text-xs">
                <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-900">
                  <HelpCircle size={14} /> Note Importante
                </p>
                L'Application est un outil de simulation et d'organisation. L'Éditeur n'effectue aucun mouvement de fonds réel, n'a pas accès aux comptes bancaires de l'Utilisateur, et ne fournit aucun service d'intermédiation financière.
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Inscription, Accès et Sécurité */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Lock size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">3. Inscription, Accès et Sécurité du Compte</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">3.1. Création du compte</h3>
                <p>
                  L'accès aux fonctionnalités de l'Application est subordonné à la création d'un Compte Utilisateur. L'Utilisateur garantit que les informations fournies lors de son inscription (notamment son adresse email) sont exactes, complètes et à jour.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">3.2. Sécurité des identifiants</h3>
                <p>
                  L'Utilisateur est seul responsable de la protection du mot de passe qu'il utilise pour accéder à l'Application. Il s'engage à ne pas le communiquer à des tiers. En cas de suspicion d'accès non autorisé, l'Utilisateur doit immédiatement modifier son mot de passe et en alerter le support technique de 7sabek.ma. L'Éditeur décline toute responsabilité pour toute perte ou dommage résultant d'un manquement à cette obligation de sécurité.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Propriété Intellectuelle */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Shield size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">4. Propriété Intellectuelle</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                L'architecture de l'Application (incluant ses fondations en Python, FastAPI, et Next.js), les modules de répartition automatisée, le code source, les textes, images, logos, et interfaces utilisateur sont la propriété exclusive de l'Éditeur, protégés par les lois marocaines et les traités internationaux relatifs à la propriété intellectuelle.
              </p>
              <p className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-medium">
                Il est strictement interdit de copier, modifier, créer une œuvre dérivée, inverser la conception ou l'assemblage (reverse engineering), ou tenter de toute autre manière de trouver le code source de l'Application.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Protection des Données (Loi n° 09-08) */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <UserCheck size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">5. Protection des Données à Caractère Personnel (Loi n° 09-08)</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Conformément à la <strong>loi n° 09-08</strong> relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, l'Éditeur s'engage à protéger la vie privée de ses Utilisateurs.
              </p>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">5.1. Nature des données collectées</h3>
                <p>
                  L'Éditeur collecte les données d'identification (email, nom) et les données financières saisies volontairement par l'Utilisateur (montants, libellés des transactions, catégories budgétaires) strictement nécessaires au fonctionnement des modules de 7sabek.ma.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">5.2. Finalité des traitements</h3>
                <p>Les données sont traitées exclusivement pour :</p>
                <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                  <li>Assurer le fonctionnement technique du système d'enveloppes et de la répartition automatisée.</li>
                  <li>Fournir un support technique à l'Utilisateur.</li>
                  <li>Établir des statistiques d'utilisation anonymisées pour améliorer les performances de l'Application.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">5.3. Droits de l'Utilisateur</h3>
                <p>
                  L'Utilisateur bénéficie d'un droit d'accès, d'information, de rectification, et d'opposition aux données qui le concernent. Ce droit s'exerce directement via les paramètres de son profil sur l'Application, ou par email à l'adresse <a href="mailto:Support@7sabek.ma" className="text-emerald-600 font-semibold hover:underline">Support@7sabek.ma</a>.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Sécurité du Système et Anti-Piratage */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                <ShieldAlert size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">6. Sécurité du Système, Lutte contre le Piratage et Tolérance Zéro</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">6.1. Mécanismes de détection et anti-piratage</h3>
                <p>
                  La plateforme 7sabek.ma déploie des systèmes de sécurité de pointe et des mécanismes de détection d'intrusion (IDS/IPS) en temps réel. Notre architecture full-stack et l'ensemble de nos API de routage sont équipés de boucliers proactifs et d'algorithmes anti-piratage. Ces dispositifs sont configurés pour identifier, isoler et bloquer instantanément tout comportement suspect, incluant mais sans s'y limiter :
                </p>
                <ul className="list-disc list-inside space-y-1 mt-1 pl-2 text-xs">
                  <li>Les tentatives d'injection (SQL, XSS, etc.) ou d'exploitation de vulnérabilités.</li>
                  <li>L'ingénierie inverse (reverse engineering) ou la tentative d'accès non autorisé à nos modules de transactions et de répartition automatisée.</li>
                  <li>Les attaques par déni de service (DDoS) ou le balayage automatisé de nos ports et serveurs.</li>
                  <li>L'usurpation de jetons d'authentification ou toute manipulation frauduleuse des requêtes réseau.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">6.2. Politique de Tolérance Zéro</h3>
                <p>
                  L'Éditeur applique une politique de tolérance zéro absolue à l'égard de toute tentative d'atteinte à l'intégrité de l'Application. L'utilisation de 7sabek.ma à des fins de test d'intrusion (pentesting non autorisé), de piratage, ou de perturbation du service est formellement interdite.
                </p>
              </div>
              <div className="rounded-2xl bg-red-50/50 border border-red-200/50 p-4 text-xs text-red-950">
                <h3 className="font-bold text-red-900 mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert size={14} /> 6.3. Poursuites judiciaires immédiates et sanctions pénales
                </h3>
                <p className="mb-2">
                  En cas de détection d'une activité malveillante ou d'une tentative de compromission :
                </p>
                <ul className="space-y-2 pl-2">
                  <li>
                    <strong className="text-red-900">• Verrouillage immédiat :</strong> Le compte de l'Utilisateur impliqué, ainsi que l'adresse IP associée, seront instantanément et définitivement bannis de notre système, sans aucune notification préalable.
                  </li>
                  <li>
                    <strong className="text-red-900">• Saisine directe des tribunaux :</strong> L'Éditeur n'émettra aucun avertissement. Nous procéderons systématiquement à la saisine des autorités judiciaires compétentes.
                  </li>
                  <li>
                    <strong className="text-red-900">• Transmission des preuves :</strong> L'ensemble des traces numériques, journaux de connexion (logs), adresses IP, requêtes API et empreintes de navigation capturées par nos systèmes anti-piratage sera automatiquement constitué en dossier de preuve et transmis à la <strong>Brigade Nationale de la Police Judiciaire (BNPJ)</strong> ainsi qu'au <strong>Procureur du Roi</strong>.
                  </li>
                </ul>
                <p className="mt-3 font-medium border-t border-red-200/60 pt-2 text-red-900">
                  Ces actes constituent des infractions graves aux systèmes de traitement automatisé des données, formellement réprimées par la législation marocaine, et plus particulièrement par la <strong>Loi n° 07-03</strong>. Les contrevenants s'exposent à de lourdes sanctions pénales, incluant des peines d'emprisonnement fermes et des amendes conséquentes, auxquelles s'ajouteront les demandes de dommages et intérêts formulées par l'Éditeur pour le préjudice subi.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Limitation de Responsabilités */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Scale size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">7. Limitation de Responsabilités</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">7.1. Fiabilité des données et décisions financières</h3>
                <p>
                  Les modules de calcul et de répartition automatisée fournissent des résultats basés exclusivement sur les données saisies par l'Utilisateur. L'Éditeur ne saurait garantir l'exactitude de la situation financière affichée si l'Utilisateur omet ou saisit des informations erronées. L'Utilisateur demeure le seul décideur de ses choix financiers ; la responsabilité de l'Éditeur ne pourra en aucun cas être engagée en cas d'endettement, de découvert bancaire ou de perte financière.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">7.2. Continuité du service</h3>
                <p>
                  L'Éditeur met en œuvre tous les moyens raisonnables pour assurer une disponibilité optimale de l'Application (obligation de moyens). Néanmoins, l'accès peut être temporairement interrompu pour des opérations de maintenance, des mises à jour des modules, ou des cas de force majeure (pannes de serveurs, dysfonctionnements du réseau internet). Ces interruptions ne donnent droit à aucune indemnité.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Durée et Suppression des Données */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">8. Durée, Résiliation et Suppression des Données</h2>
            </div>
            <div className="text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Les présentes CGU sont souscrites pour une durée indéterminée à compter de la création du compte. L'Utilisateur peut résilier son compte à tout moment depuis les paramètres de l'Application. Cette action entraîne l'effacement définitif de l'ensemble de ses historiques de transactions, de ses configurations d'enveloppes et de ses données personnelles de la base de données active, à l'exception des données devant être conservées au titre d'une obligation légale.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Modifications des Conditions */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <RefreshCw size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">9. Modifications des Conditions</h2>
            </div>
            <div className="text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                L'Éditeur se réserve le droit d'adapter ou de modifier à tout moment les présentes CGU, notamment pour intégrer de nouvelles fonctionnalités ou se conformer à des évolutions législatives. Les Utilisateurs seront informés de ces modifications par email ou via une notification dans l'Application au moins 15 jours avant leur entrée en vigueur.
              </p>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Droit Applicable */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Scale size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">10. Droit Applicable et Règlement des Litiges</h2>
            </div>
            <div className="text-sm leading-relaxed text-slate-650 pl-2 border-l-2 border-slate-100">
              <p>
                Les présentes CGU sont soumises au droit marocain. En cas de litige relatif à l'interprétation, la validité ou l'exécution des présentes, les parties s'engagent à rechercher une solution amiable. À défaut d'accord amiable dans un délai de trente (30) jours, compétence expresse est attribuée aux tribunaux compétents du Royaume du Maroc, nonobstant pluralité de défendeurs ou appel en garantie.
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
