/** A single on-screen text node the AccessibilityService read (for calibration). */
export interface CaptureText {
  text: string;
  top: number;
  left: number;
  /** Android view resource id, when the node exposes one. */
  id?: string;
}

/**
 * Best-effort price breakdown parsed from a checkout screen. Every field is fen
 * (integer) and optional — the parser only fills what it confidently matched.
 * Mirrors AmountParser.kt on the native side.
 */
export interface ParsedBreakdown {
  subtotalFen?: number;
  manjianFen?: number;
  hongbaoFen?: number;
  couponFen?: number;
  deliveryFen?: number;
  packagingFen?: number;
  memberFen?: number;
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
