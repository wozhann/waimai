/** A single on-screen text node the AccessibilityService read (for calibration). */
export interface CaptureText {
  text: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** Android view resource id, when the node exposes one. */
  id?: string;
}

/**
 * Best-effort price breakdown parsed from a checkout screen. Every field is fen
 * (integer) and optional — the parser only fills what it confidently matched.
 * Mirrors AmountParser.kt on the native side.
 *
 * `finalFen` (the to-hand price) is the reliable cross-app field; the rest are
 * only populated when the app exposes labelled rows (美团/京东 do, 饿了么 mostly
 * doesn't). `savingsFen` is the app's own headline discount (共减 / 已优惠).
 */
export interface ParsedBreakdown {
  subtotalFen?: number;
  packagingFen?: number;
  deliveryFen?: number;
  savingsFen?: number;
  finalFen?: number;
}

/** One captured checkout snapshot from a delivery app. Mirrors the Kotlin JSON. */
export interface CapturedOrder {
  id: string;
  packageName: string;
  appLabel: string;
  /** epoch millis */
  capturedAt: number;
  texts: CaptureText[];
  parsed: ParsedBreakdown;
}
