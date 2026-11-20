import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {supabase} from '../../lib/supabase';
import {freshGpsSample} from './deliveryTracking';

export const GOODIES_COURIER_LOCATION_TASK = 'wantiss-goodies-courier-background-location';

type LocationTaskData = {locations?: Location.LocationObject[]};

TaskManager.defineTask<LocationTaskData>(GOODIES_COURIER_LOCATION_TASK, async ({data, error}) => {
  if (error || !data?.locations?.length) return;

  const {data: sessionData} = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    if (await Location.hasStartedLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK);
    }
    return;
  }

  const {data: assignments, error: assignmentError} = await supabase
    .from('goodies_delivery_assignments')
    .select('order_id,status')
    .eq('courier_id', userId)
    .in('status', ['accepted', 'picked_up'])
    .order('updated_at', {ascending: false})
    .limit(1);

  if (assignmentError) throw assignmentError;
  const activeOrderId = assignments?.[0]?.order_id;
  if (!activeOrderId) {
    if (await Location.hasStartedLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(GOODIES_COURIER_LOCATION_TASK);
    }
    return;
  }

  const now = Date.now();
  const latest = data.locations.filter(sample => freshGpsSample(sample, now))
    .reduce<Location.LocationObject | null>((newest, sample) => !newest || sample.timestamp > newest.timestamp ? sample : newest, null);
  if (!latest) return;
  const {latitude, longitude, accuracy, heading, speed} = latest.coords;
  const {error: updateError} = await supabase.rpc('goodies_courier_update_location', {
    p_order_id: activeOrderId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_accuracy_m: accuracy,
    p_heading: heading,
    p_speed_mps: speed,
  });
  if (updateError) throw updateError;
});
