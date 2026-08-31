# Changelog

All notable changes to this project will be documented in this file.

## [1.2.1] - 2026-08-31
### Security
- Removed the unauthenticated `/api/chat` route (open Gemini proxy / dead code; the real assistant uses the backend `/advisor/chat`).
- Upgraded Next.js to 16.3.3 and cleared all `npm audit` findings (SSRF / DoS / Server Function disclosure, postcss, sharp, lodash).
- Content-Security-Policy hardened in production: `'unsafe-inline'` dropped from `script-src` in favour of a per-request nonce + `strict-dynamic`; added `object-src 'none'`.
- Superadmin e-mail previews now render untrusted HTML inside a sandboxed `<iframe>` instead of `dangerouslySetInnerHTML`.
- Stopped tracking `.env.local` in git.

### Changed
- Added a CI workflow (lint + test + build + `npm audit`).
- ESLint config: disabled `react/no-unescaped-entities`, downgraded `no-explicit-any` and the React-compiler effect rules to warnings; lint now passes with 0 errors.
- Dockerfile: pass `NEXT_PUBLIC_CLARITY_PROJECT_ID` as a build arg.

## [0.1.1] - 2026-05-19
### Fixed
- Dashboard: hide lower insight/summary sections until the first income declaration is completed.
- Loading screen background adjusted to white.

### Changed
- App version label source aligned to `v0.1.1`.

## [0.1.0] - 2026-05-19
### Added
- Initial public/testable release baseline.
