import React from 'react';
import { StayzApp } from './supplied/src/StayzApp';
import { supabase } from '../../lib/supabase';

type Props = {
  onBack: () => void;
  onOpenWallet?: () => void;
};

export default function StayzGuestScreen({ onBack, onOpenWallet }: Props) {
  return (
    <StayzApp
      client={supabase}
      onOpenWallet={onOpenWallet ?? onBack}
      onExitToWantiss={onBack}
    />
  );
}
