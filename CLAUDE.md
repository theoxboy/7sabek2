# 7sabek — Frontend (Next.js)

Budget-by-envelopes web app for Morocco. Trilingual **FR / EN / الدارجة (ar)**,
light + dark themes, RTL in Arabic.

- `main` is the production branch — **pushing to `main` deploys to prod
  (7sabek.ma) automatically**. There is no branch protection. CI needs Node 22+.
- Backend lives in a separate repo (`7sabek`); this repo is the frontend only.

---

## ⚠️ Versioning & changelog — do this before every commit that ships user-visible change

The version shown in the UI (`src/lib/app-version.ts`) is driven by the **first
entry** of `src/lib/changelog.ts`. The version label is clickable everywhere it
appears (`/login`, app sidebar, superadmin sidebar) and opens `/releases`, a
public changelog page. Keep it accurate and keep it clean.

### The rule: at most ONE release entry per calendar day

Before committing a batch of changes, look at `CHANGELOG[0]` in
`src/lib/changelog.ts`:

| `CHANGELOG[0].date` | What to do |
| --- | --- |
| **is today** | **Append** your bullet(s) to the existing entry's `groups`. Do **not** create a new entry, do **not** bump the version. |
| **is an earlier date** | Create **one** new entry at the top of the array for **today**, and bump the version. |

Today's date is available in the session context (`currentDate`). Never add a
second entry for a day. The user makes many small commands per day — they all
roll up into that day's single release.

### Version bump (only when creating a new dated entry)

Starting from `CHANGELOG[0].version` (e.g. `1.3.0`):

- only `fixed` items → **patch**: `1.3.0` → `1.3.1`
- any `added` item / a real new feature → **minor**: `1.3.0` → `1.4.0`
- `major` bump only when the user explicitly asks.

Then set the same string in **`package.json` → `"version"`**.

### How to write changelog items

- Audience is **end users**, not developers. Describe the **effect for the
  person using the app**.
- **No technical detail whatsoever**: no file / function / component / endpoint
  / hook / library / framework names, no "refactor", "hook", "N+1", "SWR",
  "token", "SSR". If a normal user wouldn't understand it, rephrase or drop it.
- **Trilingual**: fill `fr`, `en`, `ar` for every item, all saying the same
  thing. `ar` is Moroccan Darija, matching the tone used elsewhere in the app.
- Internal-only work (admin tools, infra, performance) → one honest, vague line
  such as *« Améliorations de stabilité et de performance »* rather than
  exposing internals or leaving nothing.
- `groups[].kind` is one of `added` (Nouveautés) · `improved` (Améliorations) ·
  `fixed` (Corrections). Omit a group if it has no items.

### When to skip the changelog entirely

Pure docs / comments / tests / CI / lockfile / dependency bumps with no visible
effect, or work that isn't shipped yet. If nothing user-observable changed,
don't touch `changelog.ts` or the version.

---

## Theme & i18n discipline

- Use CSS variables for colour: `var(--accent)`, `var(--ink)`, `var(--surface)`,
  `var(--border)`, `var(--muted)`, `var(--success)`, `var(--warning)`,
  `var(--error)` … **never** hard-coded `slate-*` / `white` / hex in components
  (a few old pages still do — don't copy them). This keeps light/dark working.
- Every user-facing string is trilingual (`fr` / `en` / `ar`) and the layout
  must mirror correctly in RTL when `dir === "rtl"`.
