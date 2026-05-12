import assert from "node:assert/strict";

import { advisorReducer } from "@/state/advisorMachine";
import { initialAdvisorContext } from "@/state/advisorContext";
import {
  blockedPreviewFixture,
  degradedPreviewFixture,
  normalPreviewFixture,
} from "@/test/fixtures/advisor/previewFixtures";

function runSmokeTests() {
  const loading = advisorReducer(initialAdvisorContext, { type: "page_open" });
  assert.equal(loading.state, "loading_preview");

  const ready = advisorReducer(loading, {
    type: "preview_loaded_ok",
    payload: normalPreviewFixture,
  });
  assert.equal(ready.state, "preview_ready");
  assert.equal(ready.preview?.proposal_count, 2);

  const blocked = advisorReducer(loading, {
    type: "preview_loaded_blocked",
    payload: blockedPreviewFixture,
  });
  assert.equal(blocked.state, "preview_blocked");
  assert.equal(blocked.preview?.mode, "blocked");

  const degraded = advisorReducer(loading, {
    type: "preview_loaded_ok",
    payload: degradedPreviewFixture,
  });
  assert.equal(degraded.state, "preview_ready");
  assert.equal(degraded.preview?.degraded_mode, true);

  const failed = advisorReducer(loading, {
    type: "preview_failed",
    error: { code: "INTERNAL_ERROR", message: "boom" },
  });
  assert.equal(failed.state, "server_error");

  const retry = advisorReducer(failed, { type: "regenerate_preview" });
  assert.equal(retry.state, "loading_preview");
}

runSmokeTests();
