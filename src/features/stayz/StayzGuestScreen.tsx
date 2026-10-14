import React from 'react';
import { StayzApp } from '../../Stayz/stayzApp';
import { supabase } from '../../lib/supabase';

interface Props {
  onBack: () => void;
}

export default function StayzGuestScreen({ onBack }: Props) {
  return (
    <StayzApp
      client={supabase}
      onExitToWantiss={onBack}
    />
  );
}
