/**
 * Customers must never see database, SQL or edge-function internals.
 * Technical detail goes to the console only; the screen gets a short plain sentence.
 * Messages written on purpose for customers by the server (for example "The delivery fee has changed.")
 * pass through; anything that looks technical is replaced by the caller's fallback.
 */
const TECHNICAL = /(violates|constraint|ambiguous|relation\s|column\s|row-level|row level|permission denied|syntax error|does not exist|duplicate key|null value|invalid input|unique|foreign key|function\s+\S+\(|schema|rpc|edge function|non-2xx|jwt|postgres|pgrst|sql|undefined|\[object|stack|TypeError|ReferenceError|Network request failed|fetch failed|timeout of|ECONN|ENOTFOUND)/i;

export function friendlyError(error: any, fallback: string): string {
  const raw = String((error && (error.message ?? error.error ?? error)) ?? '').trim();
  if (raw) console.warn('[Goodies]', fallback, '|', raw, error && error.code ? '(' + error.code + ')' : '');
  if (!raw || raw.length > 160 || TECHNICAL.test(raw) || /[{}<>_]{1}/.test(raw)) return fallback;
  if (/insufficient/i.test(raw)) return 'Insufficient Wantiss wallet balance. Add funds or choose another payment method.';
  return raw;
}
