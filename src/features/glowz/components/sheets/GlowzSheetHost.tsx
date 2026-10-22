import React from 'react';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { GlowzAreaSheet } from './GlowzAreaSheet';
import { GlowzCancelSheet } from './GlowzCancelSheet';
import { GlowzDiscardSheet } from './GlowzDiscardSheet';
import { GlowzEditProfileSheet } from './GlowzEditProfileSheet';
import { GlowzFilterSheet } from './GlowzFilterSheet';
import { GlowzPhotoSheet } from './GlowzPhotoSheet';
import { GlowzReportSheet } from './GlowzReportSheet';
import { GlowzReviewSheet } from './GlowzReviewSheet';
import { GlowzSortSheet } from './GlowzSortSheet';

/** Renders whichever sheet is open. One place maps descriptors to sheets. */
export function GlowzSheetHost() {
  const { sheet } = useGlowzSheet();
  if (!sheet) return null;
  switch (sheet.kind) {
    case 'filter': return <GlowzFilterSheet />;
    case 'sort': return <GlowzSortSheet />;
    case 'area': return <GlowzAreaSheet />;
    case 'review': return <GlowzReviewSheet bookingRef={sheet.ref} />;
    case 'cancel': return <GlowzCancelSheet bookingRef={sheet.ref} />;
    case 'report': return <GlowzReportSheet providerId={sheet.pid} />;
    case 'editProfile': return <GlowzEditProfileSheet />;
    case 'photo': return <GlowzPhotoSheet providerId={sheet.pid} index={sheet.index} />;
    case 'discard': return <GlowzDiscardSheet />;
    default: return null;
  }
}