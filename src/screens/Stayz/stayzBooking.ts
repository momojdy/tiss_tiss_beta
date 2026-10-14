import { Booking } from './stayzTypes';
import { hoursBetween } from './stayzDates';

export const doorCodeVisible = (b: Booking, now = new Date()) => (b.status === 'Upcoming' || b.status === 'Checked in') && hoursBetween(now, new Date(b.start)) <= 2 && now < new Date(b.end);

export const canExtend = (b: Booking, now = new Date()) => {
  if (!b.extOn || !b.extPrice || b.extension?.status === 'pending') return false;
  if (b.status === 'Checked in') return true;
  const toStart = hoursBetween(now, new Date(b.start));
  const toEnd = hoursBetween(now, new Date(b.end));
  return (b.status === 'Upcoming' && toStart <= 2 && toStart >= 0) || (toEnd <= 2 && toEnd >= 0);
};

export const canChange = (b: Booking) => (b.status === 'Upcoming' || b.status === 'Accepted') && b.change?.status !== 'pending' && new Date(b.start) > new Date();

export const canReview = (b: Booking) => b.status === 'Completed' && !b.reviewed;

export const bucketOf = (b: Booking) => {
  if (b.status === 'Cancelled' || b.status === 'No-show') return 'Cancelled';
  if (b.status === 'Completed') return 'Past';
  if (b.status === 'Checked in') return 'In stay';
  return 'Upcoming';
};
