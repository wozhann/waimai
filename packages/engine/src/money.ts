/** Helpers for working with monetary amounts stored as integer 分 (fen). */

/** Convert yuan to fen, e.g. yuan(12.5) === 1250. */
export function yuan(amount: number): number {
  return Math.round(amount * 100);
}

/** Format fen as a yuan string, e.g. formatYuan(1234) === "¥12.34". */
export function formatYuan(fen: number): string {
  const sign = fen < 0 ? '-' : '';
  return `${sign}¥${(Math.abs(fen) / 100).toFixed(2)}`;
}
