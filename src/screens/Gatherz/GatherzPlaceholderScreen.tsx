import React from 'react';
import { Header, Notice, Page } from '../../components/gatherz/shared';
import { useGatherz } from '../../features/gatherz/GatherzContext';
export default function GatherzPlaceholderScreen({ title }: { title: string }) {
  const { nav } = useGatherz();
  return <Page><Header title={title || 'Not found'} onBack={nav.back} /><Notice title="We could not open that screen." body="The requested Gatherz page is unavailable." action="Go back" onAction={nav.back} /></Page>;
}
