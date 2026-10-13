import React from 'react';
import { StayzApp } from './StayzApp';
import { supabase } from '../src/lib/supabase';

type Props = {
  onBack: () => void;
};

export default function StayzGuestScreen({ onBack }: Props) {
  return (
    <StayzApp
      client={supabase}
      onExitToWantiss={onBack}
    />
  );
}
