import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';
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

  const refresh = useCallback(async () => {
    try {
      const {data: authData, error: authError} = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setCurrent({kind: 'unavailable'});
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
        setCurrent({kind: 'unassigned'});
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
      setCurrent({kind: 'assigned', number: container.container_number, status: container.status});
    } catch {
      setCurrent({kind: 'unavailable'});
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Status is server-owned. Refresh on return to foreground and periodically while the page is open.
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 30000);
    return () => {
      appState.remove();
      clearInterval(interval);
    };
  }, [refresh]);

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
