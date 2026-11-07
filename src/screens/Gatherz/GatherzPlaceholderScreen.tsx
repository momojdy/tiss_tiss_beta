import React from 'react';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
/** Honest stand-in for tabs that are not built yet. Replace per milestone. */
export default function GatherzPlaceholderScreen({ title }: { title: string }) {
  const { nav } = useGatherz();
  return <Page><Header title={title} /><Notice title={`${title} is not built yet`} body="This tab is part of a later milestone. Everything else in Gatherz works." action="Back to Home" onAction={() => nav.tab('home')} /></Page>;
}