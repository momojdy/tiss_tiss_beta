import React from 'react';
import { StayzApp } from './StayzApp';
import { supabase } from '../../lib/supabase';

interface Props {
  onBack: () => void;
}

export default function StayzStandaloneEntry({ onBack }: Props) {
  return (
    <StayzApp
      client={supabase}
      onExitToWantiss={onBack}
    />
  );
}
