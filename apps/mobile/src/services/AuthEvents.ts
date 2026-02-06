import { EventEmitter } from "events";

export type AuthEventName = "expired";

/**
 * Subscribe in app root (e.g. navigation container) to redirect to Login.
 * authEvents.on("expired", () => nav.reset(...))
 */
export const authEvents = new EventEmitter();
