/** supabase.functions.invoke hides the JSON body of non-2xx replies behind a generic message.
 *  This reads the real `error` text the edge function returned. */
export async function functionErrorMessage(error: any, fallback = 'Request failed. Please try again.'): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      const text = body?.error || body?.message;
      if (typeof text === 'string' && text.trim()) return text.trim();
    } else if (ctx && typeof ctx.text === 'function') {
      const text = String(await ctx.text()).trim();
      if (text) return text.slice(0, 300);
    }
  } catch { /* fall through to the generic message */ }
  const msg = String(error?.message || '');
  return msg && !/non-2xx/i.test(msg) ? msg : fallback;
}
