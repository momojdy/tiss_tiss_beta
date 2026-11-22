import {useCallback, useRef, useState} from 'react';
import {useKonsolissRefresh} from './useKonsolissRefresh';
import {supabase} from '../../lib/supabase';

export type KonsolissContainerStatus = 'filling' | 'filled' | 'departed' | 'arrived';

type CurrentContainer =
  | {kind: 'loading'}
  | {kind: 'unassigned'}
  | {kind: 'unavailable'}
  | {kind: 'assigned'; number: string; status: KonsolissContainerStatus};

const VALID_STATUSES: KonsolissContainerStatus[] = ['filling', 'filled', 'departed', 'arrived'];

export function useCurrentKonsolissContainer(): CurrentContainer {
  const [current, setCurrent] = useState<CurrentContainer>({kind: 'loading'});

  const requestSequence=useRef(0);
  const refresh = useCallback(async () => {
    const sequence=++requestSequence.current;
    const commit=(update:()=>void)=>{if(sequence===requestSequence.current)update();};
    try {
      const {data: authData, error: authError} = await supabase.auth.getUser();
      if (authError || !authData.user) {
        commit(()=>setCurrent({kind: 'unavailable'}));
        return;
      }
      const {data: assignment, error: assignmentError} = await supabase
        .from('konsoliss_container_assignments')
        .select('container_id')
        .eq('user_id', authData.user.id)
        .eq('is_current', true)
        .order('assigned_at',{ascending:false})
        .limit(1)
        .maybeSingle();
      if (assignmentError) throw assignmentError;
      if (!assignment?.container_id) {
        commit(()=>setCurrent({kind: 'unassigned'}));
        return;
      }
      const {data: container, error: containerError} = await supabase
        .from('konsoliss_containers')
        .select('container_number,status')
        .eq('id', assignment.container_id)
        .single();
      if (containerError) throw containerError;
      if (typeof container?.container_number !== 'string' || !VALID_STATUSES.includes(container.status)) {
        throw new Error('Invalid container status');
      }
      commit(()=>setCurrent({kind: 'assigned', number: container.container_number, status: container.status}));
    } catch {
      commit(()=>setCurrent({kind: 'unavailable'}));
    }
  }, []);

  const invalidate=useCallback(()=>{requestSequence.current++;setCurrent({kind:'unavailable'});},[]);
  useKonsolissRefresh(refresh,invalidate);

  return current;
}

export function currentKonsolissContainerLabel(value: CurrentContainer): string {
  if (value.kind === 'loading') return 'Loading container…';
  if (value.kind === 'unassigned') return 'No active load';
  if (value.kind === 'unavailable') return 'Container unavailable';
  const labels: Record<KonsolissContainerStatus, string> = {
    filling: 'Filling',
    filled: 'Filled',
    departed: 'Departed',
    arrived: 'Arrived',
  };
  return value.number + ' · ' + labels[value.status];
}
