import {useCallback, useEffect, useRef, useState} from 'react';
import {supabase} from '../../lib/supabase';
import {S} from './store';
import {label} from './content';

export function useStoreReviews(storeId: string) {
  const accountId = S.accountId;
  const requestKey = `${accountId || ''}:${storeId}`;
  const [loadedFor, setLoadedFor] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offset = useRef(0), generation = useRef(0), inFlight = useRef(false);
  const load = useCallback(async (more = false) => {
    if (inFlight.current) return;
    const epoch = generation.current, account = accountId;
    inFlight.current = true;setLoading(true);setError(false);
    try {
      const {data, error: failure} = await supabase.rpc('goodies_store_reviews', {p_store_id: storeId, p_offset: more ? offset.current : 0, p_limit: 20});
      if (failure) throw failure;
      if (generation.current !== epoch || S.accountId !== account) return;
      const next = data || [];
      offset.current = (more ? offset.current : 0) + next.length;
      setRows(old => more ? [...old, ...next] : next);setHasMore(next.length === 20);
    } catch {if (generation.current === epoch && S.accountId === account) setError(true);}
    finally {if (generation.current === epoch) {inFlight.current = false;setLoading(false);setLoadedFor(requestKey);}}
  }, [storeId, accountId, requestKey]);
  useEffect(() => {
    const epoch = ++generation.current;inFlight.current = false;offset.current = 0;
    void load();
    return () => {generation.current = epoch + 1;};
  }, [load]);
  return {rows: loadedFor === requestKey ? rows.map((r: any) => ({orderId: r.order_id, n: r.is_mine ? label('lbl.reviewYou', 'You') : label('lbl.reviewCustomer', 'Customer'), r: r.rating, t: r.comment, d: new Date(r.created_at).toLocaleDateString(S.lang), you: r.is_mine})) : [], loading: loadedFor !== requestKey || loading, error: loadedFor === requestKey && error, hasMore: loadedFor === requestKey && hasMore, reload: () => load(false), more: () => load(true)};
}
