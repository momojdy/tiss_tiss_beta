import React from 'react';
import { Pressable, View } from 'react-native';
import type { BookingFlow } from '../../hooks/useBookingFlow';
import { useContentWidth, useGutter } from '../../styles/LayoutContext';
import { useGlowzTheme } from '../../styles/ThemeContext';
import type { BookingDraft } from '../../types/booking';
import type { Provider } from '../../types/provider';
import { resolveStaff } from '../../utils/bookingDraft';
import { sameDay } from '../../utils/clock';
import { fmtD, fmtT, monthShort, weekdayShort } from '../../utils/format';
import { bookingTotals } from '../../utils/pricing';
import { GlowzButton } from '../GlowzButton';
import { GlowzBadge } from '../GlowzBadge';
import { GlowzCard } from '../GlowzCard';
import { GlowzHorizontalRail } from '../GlowzHorizontalRail';
import { GlowzText } from '../GlowzText';
import type { Booking } from '../../types/booking';

interface Props { draft: BookingDraft; provider: Provider; flow: BookingFlow; bookings: Booking[]; onWaitlisted: string[] }

/** Date strip, a grid of half-hour slots (unavailable ones dimmed and disabled) and the waitlist for full days. */
export function GlowzBookingDateTimeStep({ draft, provider: p, flow, bookings, onWaitlisted }: Props) {
  const { c } = useGlowzTheme();
  const g = useGutter();
  const slotW = (useContentWidth() - g.left - g.right - 24) / 4;
  const dur = bookingTotals(draft, p).dur;
  const map = resolveStaff(draft, p, bookings);
  const avail = Object.keys(map).length > 0;
  const all: number[] = [];
  for (let m = 540; m + dur <= 1140; m += 30) all.push(m);
  const date = draft.date;
  const onList = date ? onWaitlisted.includes(draft.pid + '|' + date.getTime()) : false;
  return (
    <View style={{ gap: 14 }}>
      <GlowzText kind="display" size={22}>Pick a date and time</GlowzText>
      <GlowzText kind="small" muted>{draft.resched ? `Moving ${draft.resched} · ${dur} min` : `${dur} min total`}</GlowzText>
      <View style={{ marginHorizontal: -g.left }}>
        <GlowzHorizontalRail gap={8}>
          {flow.days().map((d) => {
            const on = !!date && sameDay(d, date);
            return (
              <Pressable
                key={d.getTime()}
                onPress={() => flow.setDate(d)}
                accessibilityRole="button"
                accessibilityLabel={fmtD(d, true)}
                accessibilityState={{ selected: on }}
                style={{ width: 58, paddingVertical: 10, borderRadius: 14, alignItems: 'center', gap: 1, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface }}
              >
                <GlowzText kind="small" color={on ? c.accentInk : c.ink}>{weekdayShort(d)}</GlowzText>
                <GlowzText kind="display" size={24} color={on ? c.accentInk : c.ink} style={{ fontVariant: ['lining-nums'] }}>{String(d.getDate())}</GlowzText>
                <GlowzText kind="small" color={on ? c.accentInk : c.ink}>{monthShort(d)}</GlowzText>
              </Pressable>
            );
          })}
        </GlowzHorizontalRail>
      </View>
      {avail ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {all.map((m) => {
              const ok = map[m] !== undefined;
              const on = draft.time === m;
              return (
                <Pressable
                  key={m}
                  disabled={!ok}
                  onPress={() => flow.setTime(m)}
                  accessibilityRole="button"
                  accessibilityLabel={ok ? fmtT(m) : `${fmtT(m)} unavailable`}
                  accessibilityState={{ selected: on, disabled: !ok }}
                  style={{ width: slotW, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : c.surface, opacity: ok ? 1 : 0.35 }}
                >
                  <GlowzText size={13} weight={on ? 600 : 500} color={on ? c.accentInk : c.ink} style={{ fontVariant: ['tabular-nums'], textDecorationLine: ok ? 'none' : 'line-through' }}>{fmtT(m)}</GlowzText>
                </Pressable>
              );
            })}
          </View>
          <GlowzText kind="small" muted>Dimmed times are unavailable.</GlowzText>
        </>
      ) : (
        <GlowzCard gap={8} style={{ alignItems: 'center', paddingVertical: 24 }}>
          <GlowzText weight={600}>No openings on {date ? fmtD(date) : 'this day'}</GlowzText>
          <GlowzText muted center>Try another day, or join the waitlist and we will tell you if a slot opens. Offers expire so nobody is double booked.</GlowzText>
          {onList ? <GlowzBadge tone="ok" label="You are on the waitlist" /> : null}
          <GlowzButton small variant={onList ? 'ghost' : 'soft'} label={onList ? 'Leave waitlist' : 'Join waitlist'} onPress={flow.toggleWaitlist} />
        </GlowzCard>
      )}
      <GlowzText kind="small" muted>Sample clock set to 10:00 so today always has slots.</GlowzText>
    </View>
  );
}
