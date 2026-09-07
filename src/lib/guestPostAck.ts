/**
 * The "post-ack moment": right after a guest confirms they saved their recovery
 * code (protection 40 → 70), we want a dedicated "finish your account" prompt —
 * not a silent state change.
 *
 * `handleAck` reloads the page, so the intent has to survive the reload. It does,
 * as a one-shot `sessionStorage` flag:
 *
 *  - `armPostAckPrompt()` is called *just before* the ack reload.
 *  - `consumePostAckFlag()` reads **and clears** the flag on the next mount, so
 *    the prompt (and its `guest_post_ack_prompt_shown` event) fire exactly once,
 *    never on a later reload of the same page.
 *
 * Scope is deliberately one tab / one flow: the ack click, the reload and the
 * flag read all happen in the same tab. A guest acking in tab A does not get the
 * prompt in tab B — that is fine, the prompt belongs to the flow that just acked.
 */

export const POST_ACK_FLAG = "7sabek.guest.post_ack";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function sessionStore(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null; // private mode / storage disabled
  }
}

/** Arm the prompt for the next page load. Call right before the ack reload. */
export function armPostAckPrompt(store: StorageLike | null = sessionStore()): void {
  try {
    store?.setItem(POST_ACK_FLAG, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Read the flag and clear it. Returns `true` at most once per `armPostAckPrompt`
 * — a second call (or a later reload) returns `false`.
 */
export function consumePostAckFlag(store: StorageLike | null = sessionStore()): boolean {
  try {
    const hit = store?.getItem(POST_ACK_FLAG) === "1";
    if (hit) store?.removeItem(POST_ACK_FLAG);
    return hit;
  } catch {
    return false;
  }
}

/**
 * Whether the prompt should actually open: the flag was just consumed AND the
 * user is still an un-claimed guest (they may have claimed in another tab).
 */
export function shouldOpenPostAckPrompt(
  flagConsumed: boolean,
  user: { is_guest?: boolean | null; claimed_at?: string | null }
): boolean {
  return flagConsumed && Boolean(user.is_guest) && !user.claimed_at;
}
