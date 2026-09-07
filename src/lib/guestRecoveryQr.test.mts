import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCode, recoveryUrl, recoveryQrSvg } from "./guestRecoveryQr.ts";

test("normalizeCode strips separators and upper-cases", () => {
  assert.equal(normalizeCode("g239-vpgn"), "G239VPGN");
  assert.equal(normalizeCode(" G2 39 vp gn "), "G239VPGN");
  assert.equal(normalizeCode(""), "");
});

test("recoveryUrl points at /login with a clean rc param (SSR origin)", () => {
  // no window in node → falls back to the prod origin
  assert.equal(recoveryUrl("G239-VPGN"), "https://7sabek.ma/login?rc=G239VPGN");
});

test("recoveryQrSvg returns an svg data URI", () => {
  const uri = recoveryQrSvg("https://7sabek.ma/login?rc=G239VPGN");
  assert.ok(uri.startsWith("data:image/svg+xml;utf8,"));
  assert.ok(decodeURIComponent(uri).includes("<svg"));
});
