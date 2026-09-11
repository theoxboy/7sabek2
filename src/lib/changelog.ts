/**
 * 7sabek — journal des versions (user-facing changelog).
 *
 * ⚠️  Lire `CLAUDE.md` (section "Versioning & changelog") avant d'éditer ce
 *     fichier. En résumé :
 *      - Une seule entrée (release) par jour maximum. Si la date du jour a déjà
 *        une entrée, on AJOUTE des puces dedans, on ne crée pas de nouvelle
 *        version.
 *      - Langage grand public, trilingue fr/en/ar, AUCUN détail technique
 *        (pas de nom de fichier, d'endpoint, de librairie, de stack).
 *      - La 1ʳᵉ entrée du tableau = la version affichée dans l'app.
 *
 * Ordre : le plus récent EN PREMIER.
 */

export type ChangeItem = { fr: string; en: string; ar: string };
export type ChangeKind = "added" | "improved" | "fixed";

export type Release = {
  version: string;
  /** ISO `yyyy-mm-dd`. */
  date: string;
  /** Phrase d'accroche facultative, mise en avant en haut de l'entrée. */
  highlight?: ChangeItem;
  groups: { kind: ChangeKind; items: ChangeItem[] }[];
};

export const CHANGELOG: Release[] = [
  {
    version: "1.5.0",
    date: "2026-09-11",
    groups: [
      {
        kind: "added",
        items: [
          {
            fr: "Une nouvelle section « Étape par étape » sur la page d'accueil explique en 4 points comment 7sabek t'accompagne : ta situation, ta répartition, le suivi de tes dépenses, puis tes crédits et tes objectifs.",
            en: "A new \"Step by step\" section on the home page walks through 4 points on how 7sabek has your back: your situation, your split, tracking your spending, then your debts and goals.",
            ar: "قسم جديد « خطوة بخطوة » فالصفحة الرئيسية كيشرح فـ4 نقط كيفاش كيمشي معاك 7sabek: وضعيتك، التوزيع ديالك، تتبع المصاريف، ومن بعد الكريديات والأهداف.",
          },
          {
            fr: "Ba Omar fait son apparition sur la page d'accueil : le visage de l'assistant qui comprend tes dépenses écrites en une phrase et répond à tes questions sur ton budget.",
            en: "Meet Ba Omar on the home page: the face of the assistant that understands your expenses written in one sentence and answers your budget questions.",
            ar: "با عمر بان فالصفحة الرئيسية: وجه المساعد اللي كيفهم مصاريفك مكتوبة فجملة وحدة وكيجاوبك على أسئلتك على الميزانية.",
          },
          {
            fr: "Page d'accueil encore allégée : les sections détaillées devenues redondantes avec la nouvelle présentation ont été retirées.",
            en: "Home page trimmed further: the detailed sections that had become redundant with the new presentation were removed.",
            ar: "الصفحة الرئيسية زادت خفت: تحيدو الأقسام المفصلة اللي ولات زايدة مع التقديم الجديد.",
          },
        ],
      },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-09-10",
    groups: [
      {
        kind: "improved",
        items: [
          {
            fr: "Écran de répartition (mode découverte) : chaque point de départ explique en une ligne ce qu'il fait, la répartition « Égale » est maintenant vraiment équilibrée, et un choix appliqué par erreur s'annule d'un seul tap sans perdre tes réglages.",
            en: "Split screen (discovery mode): each starting point now says in one line what it does, the \"Equal\" split is genuinely even, and a preset applied by mistake can be undone in one tap without losing your tweaks.",
            ar: "شاشة التقسيم (وضع الاكتشاف): كل نقطة بداية كتشرح ف سطر واش كتدير، تقسيم « بالتساوي » ولا متوازن بصح، والاختيار اللي طبقتيه بالغلط كترجعو بضغطة وحدة بلا ما تخسر التعديلات ديالك.",
          },
          {
            fr: "Ajouter une enveloppe pendant la répartition garde ton découpage au lieu de tout remettre à zéro, et « Passer » enregistre quand même la répartition affichée à l'écran.",
            en: "Adding an envelope while splitting keeps your breakdown instead of resetting it, and \"Skip\" still saves the split shown on screen.",
            ar: "زيادة ظرف أثناء التقسيم كتحافظ على التوزيع ديالك بلا ما يرجع كلشي لصفر، و « تجاوز » كيسجل التقسيم اللي بان فالشاشة.",
          },
          {
            fr: "Page d'accueil allégée : plusieurs sections et éléments superflus ont été retirés pour aller plus vite à l'essentiel.",
            en: "Lighter home page: several sections and clutter were removed to get to the point faster.",
            ar: "الصفحة الرئيسية ولات خفيفة: تحيدو منها بزاف ديال الأقسام والتفاصيل الزايدة باش توصل بسرعة للمهم.",
          },
          {
            fr: "Le bouton d'installation de la page d'accueil s'adapte maintenant à ton appareil : téléchargement direct sur Android, ajout à l'écran d'accueil sur iPhone, et installation en un clic sur Chrome (ordinateur).",
            en: "The install button on the home page now adapts to your device: direct download on Android, add to home screen on iPhone, and one-click install on Chrome (computer).",
            ar: "زر التثبيت فالصفحة الرئيسية ولا كيتأقلم مع الجهاز ديالك: تحميل مباشر فأندرويد، زيادة للشاشة الرئيسية فالآيفون، وتثبيت بضغطة وحدة فـ Chrome (كمبيوتر).",
          },
          {
            fr: "Le simulateur de la page d'accueil calcule maintenant des charges fixes réalistes selon le salaire testé (plus de loyer qui dépasse un petit salaire), et explique la différence entre montant fixe et pourcentage.",
            en: "The home page simulator now scales fixed expenses realistically with the tested salary (no more rent bigger than a small paycheck), and explains the difference between a fixed amount and a percentage.",
            ar: "محاكي الصفحة الرئيسية دابا كيحسب مصاريف ثابتة معقولة حسب السالير اللي كتجرب (ماشي كنكرا فوق السالير ديالي)، وكيشرح الفرق بين المبلغ الثابت والنسبة.",
          },
        ],
      },
      {
        kind: "fixed",
        items: [
          {
            fr: "Améliorations de stabilité sur les outils internes.",
            en: "Stability improvements to internal tools.",
            ar: "تحسينات فالاستقرار على الأدوات الداخلية.",
          },
        ],
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-09-09",
    groups: [
      {
        kind: "added",
        items: [
          {
            fr: "Mode découverte : une prise en main en 5 écrans juste après « Essayer sans compte » — comment marche l'app, ton revenu, une répartition de départ à choisir, et ton code de reprise. Passable à chaque écran, et elle reprend là où tu t'es arrêté.",
            en: "Discovery mode: a 5-screen getting-started right after \"Try without an account\" — how the app works, your income, a starting split to choose, and your recovery code. Skippable at every screen, and it resumes where you left off.",
            ar: "وضع الاكتشاف: تعريف ف 5 شاشات مباشرة من بعد « جرّب بلا حساب » — كيفاش كتخدم الأبليكاسيون، الدخل ديالك، تقسيم ديال البداية باش تختار، وكود الاسترجاع ديالك. تقدر تقفز فأي شاشة، وكتكمل من فين وقفتي.",
          },
        ],
      },
      {
        kind: "improved",
        items: [
          {
            fr: "La page « Répartir mon revenu » occupe maintenant tout l'écran sur ordinateur, et tu peux ajouter des enveloppes — depuis une liste de suggestions (Santé, Loisirs, Restaurants…) ou en tapant un nom.",
            en: "The \"Split my income\" page now uses the full screen on desktop, and you can add envelopes — from a list of suggestions (Health, Leisure, Restaurants…) or by typing a name.",
            ar: "صفحة « قسّم دخلي » ولّات كتاخد الشاشة كاملة فالأورديناتور، وتقدر تزيد أظرفة — من لائحة اقتراحات (الصحة، الترفيه، المطاعم…) ولا بكتابة سمية.",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.3",
    date: "2026-09-08",
    groups: [
      {
        kind: "added",
        items: [
          {
            fr: "Mode découverte : tu peux maintenant configurer la répartition de ton revenu entre tes enveloppes, sans compte. La page t’indique ce qu’un compte ajoute (enveloppes proposées automatiquement, vue complète de ton salaire et de tes dépenses) et te laisse le choix — tout est gardé si tu crées ton compte ensuite.",
            en: "Discovery mode: you can now set up how your income is split across your envelopes, without an account. The page shows what an account adds (envelopes suggested automatically, a full view of your salary and spending) and leaves the choice to you — everything is kept if you create your account afterwards.",
            ar: "وضع الاكتشاف: دابا تقدر تعمّر توزيع دخلك على الأظرفة ديالك، بلا حساب. الصفحة كتوريك شنو كيزيد الحساب (أظرفة مقترحة أوتوماتيك، نظرة كاملة على الراتب والمصاريف) وكتخليك تختار — وكلشي كيتحفظ إلا صاوبتي حسابك من بعد.",
          },
        ],
      },
      {
        kind: "improved",
        items: [
          {
            fr: "La page « Répartir mon revenu » est plus simple : impossible de dépasser 100 %, une barre montre la forme de ton budget, tes montants en dirhams sont affichés, et trois réglages rapides (égal, l'essentiel d'abord, épargner plus) te font gagner du temps.",
            en: "The \"Split my income\" page is simpler: you can't go over 100%, a bar shows the shape of your budget, your amounts show in dirhams, and three quick presets (equal, essentials first, save more) save you time.",
            ar: "صفحة « قسّم دخلي » ولّات أبسط: ما تقدرش تفوت 100٪، شريط كيوريك شكل الميزانية ديالك، المبالغ بالدرهم كتبان، وثلاثة إعدادات سريعة (بالتساوي، الضروري أولاً، توفير أكثر) كيربحو ليك الوقت.",
          },
          {
            fr: "Après avoir créé ton compte depuis le mode découverte, un rappel discret sur le tableau de bord te propose de compléter ton profil (prénom, photo) quand tu veux.",
            en: "After creating your account from discovery mode, a quiet reminder on the dashboard invites you to complete your profile (first name, photo) whenever you like.",
            ar: "من بعد ما تصاوب حسابك من وضع الاكتشاف، تذكير خفيف فالطابلو دو بور كيقترح ليك تكمل البروفيل ديالك (السمية، التصويرة) ملي بغيتي.",
          },
          {
            fr: "Le bandeau en haut du tableau de bord est plus vivant : lumières animées et halo qui suit la souris.",
            en: "The banner at the top of the dashboard feels more alive: gently moving lights and a glow that follows your cursor.",
            ar: "الشريط اللي فوق فالطابلو دوبور ولا حي كثر: أضواء كتحرك بشوية وضّو كيتبع الماوس ديالك.",
          },
          {
            fr: "Le même bandeau lumineux habille maintenant le haut des autres pages (transactions, enveloppes, rapports, catégories, règles…).",
            en: "The same glowing banner now tops the other pages too (transactions, envelopes, reports, categories, rules…).",
            ar: "نفس الشريط المضوّي ولا كيبان دابا فوق الصفحات الأخرى (المعاملات، الأظرفة، التقارير، الأصناف، القواعد…).",
          },
          {
            fr: "Mode découverte : les pages réservées aux comptes s’affichent en aperçu figé avec un message qui explique l’intérêt de la fonction, au lieu de boutons qui ne marchent pas. Le menu ne montre plus de raccourcis inutilisables, et la page des catégories est claire en lecture seule.",
            en: "Discovery mode: account-only pages now show as a frozen preview with a message explaining what the feature does, instead of buttons that don’t work. The menu no longer shows shortcuts you can’t use, and the categories page is clear in read-only.",
            ar: "وضع الاكتشاف: الصفحات اللي خاصها حساب كتبان دابا كأنها معاينة مجمّدة مع شرح ديال الفائدة، بلا بوطونات ما كيخدموش. القائمة ما بقاتش كتوري روابط ما تنفعش، وصفحة الأصناف واضحة فقراءة فقط.",
          },
          {
            fr: "Le choix du pseudo de classement ne bloque plus l’entrée dans l’app : il est proposé sur la page du classement, avec un bouton « Plus tard », un compteur de caractères et des messages traduits.",
            en: "Picking your leaderboard nickname no longer blocks your way into the app: it’s offered on the leaderboard page, with a “Later” button, a character counter and translated messages.",
            ar: "اختيار الاسم ديال الترتيب ما بقاش كيسد ليك الطريق للتطبيق: كيتقترح فصفحة الترتيب، مع بوطون « من بعد »، عداد الحروف، ورسائل مترجمة.",
          },
          {
            fr: "L’équipe 7sabek peut maintenant activer ou mettre en pause le mode découverte (site et application Android), avec un message d’explication personnalisé si besoin.",
            en: "The 7sabek team can now turn discovery mode on or pause it (website and Android app), with a custom explanation message when needed.",
            ar: "فريق 7sabek دابا يقدر يشعّل ولا يوقّف وضع الاكتشاف (الموقع والتطبيق أندرويد)، مع رسالة توضيحية مخصصة إلا كان خاص.",
          },
          {
            fr: "Page d’accueil allégée : moins de textes qui se répètent, un bandeau d’installation Android plus court et une section d’en-tête plus aérée.",
            en: "Lighter landing page: fewer repetitive blurbs, a shorter Android install banner and a more breathable header section.",
            ar: "الصفحة الرئيسية ولّات أخف: نصوص أقل كتعاود، شريط تثبيت أندرويد أقصر، وجزء العنوان ولّا أوسع.",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.2",
    date: "2026-09-07",
    groups: [
      {
        kind: "improved",
        items: [
          {
            fr: "En mode découverte, quand tu atteins le nombre maximum d’enveloppes, un message clair te l’explique et te propose de créer ton compte gratuit — tes enveloppes actuelles sont gardées.",
            en: "In discovery mode, when you reach the maximum number of envelopes, a clear message explains it and offers to create your free account — your current envelopes are kept.",
            ar: "فوضع الاكتشاف، ملي توصل للعدد الأقصى ديال الأظرفة، كتبان ليك رسالة واضحة كتشرح ليك وكتقترح تصاوب حسابك المجاني — الأظرفة اللي عندك دابا كتبقى محفوظة.",
          },
          {
            fr: "Mode découverte : le texte du code de reprise est plus clair — note-le en dehors du navigateur, sinon rien ne peut être récupéré.",
            en: "Discovery mode: the recovery-code wording is clearer — save it outside the browser, otherwise nothing can be recovered.",
            ar: "وضع الاكتشاف: النص ديال كود الاسترجاع ولّا أوضح — سجّلو خارج المتصفح، وإلا ما يمكن نرجّعو والو.",
          },
          {
            fr: "Mode découverte : une page d’accueil claire t’explique le mode et te montre ton code de reprise avant d’entrer dans l’app, au lieu d’un encart serré sur le tableau de bord.",
            en: "Discovery mode: a clear welcome page explains the mode and shows your recovery code before you enter the app, instead of a cramped box on the dashboard.",
            ar: "وضع الاكتشاف: صفحة ترحيب واضحة كتشرح ليك الوضع وكتوريك كود الاسترجاع ديالك قبل ما تدخل للتطبيق، عوض علبة مزحومة فالتابلو دو بور.",
          },
          {
            fr: "Mode découverte : plusieurs façons de ne jamais perdre ton code de reprise — l’enregistrer en image (avec QR), le partager, te l’envoyer par e-mail, ou tout simplement sécuriser ton budget avec Face ID / empreinte. Un rappel discret s’affiche tant que ce n’est pas fait.",
            en: "Discovery mode: several ways to never lose your recovery code — save it as an image (with a QR), share it, email it to yourself, or just secure your budget with Face ID / fingerprint. A quiet reminder stays until it’s done.",
            ar: "وضع الاكتشاف: بزّاف ديال الطرق باش عمرك ما تخسر كود الاسترجاع ديالك — حفظو كصورة (مع QR)، شارك، صيفطو ليك فالإيميل، ولا أمّن الميزانية ديالك بـ Face ID / البصمة. تذكير خفيف كيبقى حتى تدير الأمر.",
          },
          {
            fr: "Mode découverte : la page de bienvenue s’affiche toujours à la création, le tableau de bord n’est plus encombré par l’encart de découverte, et la page Réglages ne montre que ce qui te concerne.",
            en: "Discovery mode: the welcome page always shows on sign-up, the dashboard is no longer cluttered by the discovery box, and Settings only shows what applies to you.",
            ar: "وضع الاكتشاف: صفحة الترحيب كتبان ديما فالبداية، التابلو دو بور ما بقاش مزحوم بعلبة الاكتشاف، وصفحة الإعدادات كتوري غير اللي يخصك.",
          },
          {
            fr: "La page d’accueil est moins encombrée : la fenêtre de l’application mobile ne s’ouvre plus toute seule à chaque visite. Elle reste accessible depuis le bouton en haut de page.",
            en: "The home page is less cluttered: the mobile-app window no longer pops up on its own on every visit. It’s still available from the button at the top of the page.",
            ar: "الصفحة الرئيسية ولّات أقل ازدحام: نافذة التطبيق ديال الموبايل ما بقاتش كتحل وحدها فكل زيارة. باقاها موجودة من الزر اللي فوق فالصفحة.",
          },
        ],
      },
      {
        kind: "fixed",
        items: [
          {
            fr: "Mode découverte : si « Effacer mes données » n’aboutit pas, tu es maintenant prévenu clairement et rien n’est supprimé, au lieu d’être déconnecté comme si c’était fait.",
            en: "Discovery mode: if “Erase my data” doesn’t go through, you’re now told clearly and nothing is deleted, instead of being signed out as if it worked.",
            ar: "وضع الاكتشاف: إلا « مسح البيانات ديالي » ما كملش، دابا كتُنبّه بوضوح وحتى حاجة ما كتتمسح، عوض ما تتخرّج بحال إلا تمّ.",
          },
          {
            fr: "Mode découverte : en te connectant à un compte existant pour garder tes dépenses, une coupure de connexion ne peut plus ajouter tes dépenses en double.",
            en: "Discovery mode: when signing in to an existing account to keep your expenses, a dropped connection can no longer add your expenses twice.",
            ar: "وضع الاكتشاف: ملي كتدخل لحساب موجود باش تخلّي مصاريفك، انقطاع الاتصال ما بقاش يقدر يزيد مصاريفك مرتين.",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.1",
    date: "2026-09-03",
    groups: [
      {
        kind: "improved",
        items: [
          {
            fr: "En mode découverte, les fonctionnalités qui demandent un compte affichent maintenant un message clair qui rappelle que 7sabek est 100% gratuit, avec un bouton pour créer son compte sans rien perdre.",
            en: "In discovery mode, features that need an account now show a clear message reminding you that 7sabek is 100% free, with a button to create your account without losing anything.",
            ar: "فوضع الاكتشاف، الخصائص اللي كتطلب حساب ولّات كتبيّن رسالة واضحة كتفكّرك بلي 7sabek مجاني 100%، مع زر باش تصاوب حسابك بلا ما تخسر والو.",
          },
          {
            fr: "L’assistant IA reste accessible en mode découverte avec quelques messages par jour, puis invite à créer un compte gratuit pour un accès sans limite.",
            en: "The AI assistant stays available in discovery mode with a few messages a day, then invites you to create a free account for unlimited access.",
            ar: "المساعد الذكي كيبقى متاح فوضع الاكتشاف بشي كم ديال الرسائل فاليوم، من بعد كيدعيك تصاوب حساب مجاني باش يكون عندك دخول بلا حدود.",
          },
          {
            fr: "En mode découverte : un indicateur de protection de ton budget, ton code de reprise consultable et copiable, un bouton pour tout effacer immédiatement, et une explication claire du mode — le tout rappelant que l’app est gratuite à vie.",
            en: "In discovery mode: a gauge showing how protected your budget is, your recovery code you can view and copy, a button to erase everything right away, and a plain explanation of the mode — all reminding you the app is free for life.",
            ar: "فوضع الاكتشاف: مؤشر كيوريك شحال الميزانية ديالك محمية، الكود ديال الاسترجاع تقدر تشوفو وتنسخو، زر باش تمسح كولشي دغيا، وشرح واضح للوضع — وكولشي كيفكّرك بلي التطبيق مجاني مدى الحياة.",
          },
          {
            fr: "Après avoir créé ton compte depuis le mode découverte, tu arrives directement dans l’app — l’onboarding devient facultatif, plus jamais imposé.",
            en: "After creating your account from discovery mode you land straight in the app — onboarding becomes optional, never forced.",
            ar: "من بعد ما تصاوب حسابك من وضع الاكتشاف، كتدخل نيشان للتطبيق — الـ onboarding ولّا اختياري، ما بقاش إجباري.",
          },
          {
            fr: "En mode découverte, tu démarres avec un budget déjà en place (Loyer, Courses, Transport…) au lieu d’un écran vide — tu ajustes et tu commences à suivre tes dépenses tout de suite.",
            en: "In discovery mode you start with a budget already set up (Rent, Groceries, Transport…) instead of an empty screen — tweak it and start tracking right away.",
            ar: "فوضع الاكتشاف، كتبدا بميزانية واجدة (الكراء، الگضيان، الترانسبور…) عوض شاشة خاوية — تعدّلها وتبدا تتبّع مصاريفك دغيا.",
          },
          {
            fr: "Tu peux créer ton compte en un geste avec Face ID ou l’empreinte, sans e-mail ni mot de passe (quand ton appareil le permet).",
            en: "You can create your account in one tap with Face ID or fingerprint, no email or password (where your device supports it).",
            ar: "تقدر تصاوب حسابك بضغطة وحدة بـ Face ID ولا البصمة، بلا إيميل ولا كلمة السر (فاش التيليفون ديالك كيسمح).",
          },
          {
            fr: "Si tu avais déjà un budget de découverte sur cet appareil et que tu l’as perdu, l’écran de connexion te propose de le récupérer avec ton code de reprise.",
            en: "If you had a discovery budget on this device and lost it, the sign-in screen offers to bring it back with your recovery code.",
            ar: "إلا كان عندك ميزانية ديال الاكتشاف ف هاد التيليفون وضاعت ليك، شاشة الدخول كتقترح عليك ترجّعها بالكود ديال الاسترجاع.",
          },
          {
            fr: "En mode découverte, tu peux enregistrer une dépense dès la première seconde (avant, il fallait passer par la configuration). Et une fois que tu as suivi quelques dépenses, 7sabek te montre tes vrais chiffres pour t’inviter à garder ton budget.",
            en: "In discovery mode you can log an expense from the very first second (before, you had to set things up first). And once you’ve tracked a few, 7sabek shows you your real figures and invites you to keep your budget.",
            ar: "فوضع الاكتشاف، تقدر تسجّل مصروف من أول ثانية (قبل، كان خاصك دوز على الإعدادات). وملي تتبّع شي مصاريف، 7sabek كيوريك الأرقام الحقيقية ديالك وكيدعيك تحتافظ بالميزانية ديالك.",
          },
          {
            fr: "Si tu as déjà un compte 7sabek, tu peux t’y connecter depuis le mode découverte et tes dépenses suivies sont ajoutées à ton compte.",
            en: "If you already have a 7sabek account you can sign in to it from discovery mode and your tracked expenses are added to it.",
            ar: "إلا عندك ديجا حساب 7sabek، تقدر تدخل ليه من وضع الاكتشاف والمصاريف اللي تبّعتي كيتزادو ليه.",
          },
          {
            fr: "Sur Safari iPhone, le mode découverte t’avertit clairement que le navigateur efface les données au bout de 7 jours, et te montre ton code de reprise tout de suite pour ne rien perdre.",
            en: "On Safari for iPhone, discovery mode clearly warns you that the browser clears data after 7 days, and shows your recovery code right away so nothing is lost.",
            ar: "على Safari ديال iPhone، وضع الاكتشاف كينبّهك بوضوح بلي المتصفح كيمسح البيانات بعد 7 أيام، وكيوريك كود الاسترجاع دغيا باش ما تخسر والو.",
          },
        ],
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-02",
    highlight: {
      fr: "Une supervision de la plateforme plus claire, plus rapide et plus fiable.",
      en: "Clearer, faster and more reliable platform monitoring.",
      ar: "مراقبة المنصة ولّات أوضح، أسرع وأكثر موثوقية.",
    },
    groups: [
      {
        kind: "added",
        items: [
          {
            fr: "Nouveau mode découverte : essaie 7sabek sans créer de compte et sans rien remplir. Tu gardes tes données et tu crées ton compte quand tu veux, même en changeant de téléphone.",
            en: "New discovery mode: try 7sabek without creating an account or filling anything in. Your data stays, and you create your account whenever you want — even if you switch phones.",
            ar: "وضع اكتشاف جديد: جرّب 7sabek بلا ما تصاوب حساب وبلا ما تعمّر والو. البيانات ديالك كتبقى، وكتصاوب الحساب فاش بغيتي، حتى إلا بدّلتي التيليفون.",
          },
        ],
      },
      {
        kind: "improved",
        items: [
          {
            fr: "Améliorations de stabilité et de performance dans toute l’application.",
            en: "Stability and performance improvements across the app.",
            ar: "تحسينات فالاستقرار والأداء فجميع أنحاء التطبيق.",
          },
          {
            fr: "Interface d’administration modernisée et réorganisée pour un suivi complet de l’activité.",
            en: "Modernized, reorganized admin interface for end-to-end activity monitoring.",
            ar: "واجهة الإدارة تجدّدت واتنظمات باش تتبع النشاط كامل.",
          },
        ],
      },
      {
        kind: "fixed",
        items: [
          {
            fr: "Correction de l’affichage de plusieurs statistiques de suivi qui pouvaient être incomplètes.",
            en: "Fixed several monitoring statistics that could show incomplete figures.",
            ar: "إصلاح بزّاف ديال إحصائيات المتابعة اللي كانت تبان ناقصة.",
          },
          {
            fr: "Correction des informations de sauvegarde qui pouvaient afficher une fausse alerte.",
            en: "Fixed backup information that could raise a false alert.",
            ar: "إصلاح معلومات النسخ الاحتياطية اللي كانت تعطي تنبيه غالط.",
          },
        ],
      },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-08-15",
    highlight: {
      fr: "Version de référence de 7sabek : budget par enveloppes, plan financier et rapports.",
      en: "7sabek baseline release: envelope budgeting, money plan and reports.",
      ar: "النسخة المرجعية ديال 7sabek: ميزانية بالأظرفة، خطة مالية وتقارير.",
    },
    groups: [
      {
        kind: "added",
        items: [
          {
            fr: "Budget par enveloppes, répartition automatique du salaire et suivi du cash disponible.",
            en: "Envelope budgeting, automatic salary distribution and available-cash tracking.",
            ar: "ميزانية بالأظرفة، تقسيم تلقائي ديال الراتب وتتبع الكاش المتاح.",
          },
          {
            fr: "Money Plan, objectifs, dettes et rapports multilingues (FR · EN · الدارجة).",
            en: "Money Plan, goals, debts and multilingual reports (FR · EN · Darija).",
            ar: "Money Plan، الأهداف، الديون وتقارير بلغات متعددة (بالفرنسية · بالإنجليزية · بالدارجة).",
          },
        ],
      },
    ],
  },
];

export const LATEST_RELEASE = CHANGELOG[0];
