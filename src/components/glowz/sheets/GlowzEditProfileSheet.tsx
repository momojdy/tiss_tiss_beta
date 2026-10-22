import React, { useState } from 'react';
import { View } from 'react-native';
import { useGlowzSheet } from '../../hooks/GlowzSheetContext';
import { useProfileSettings } from '../../hooks/useProfileSettings';
import type { ProfileErrors } from '../../utils/profileValidation';
import { useGlowzTheme } from '../../styles/ThemeContext';
import { savedNote } from '../../utils/storageStatus';
import { GlowzButton } from '../GlowzButton';
import { GlowzSheet } from '../GlowzSheet';
import { GlowzText } from '../GlowzText';
import { GlowzTextField } from '../GlowzTextField';

export function GlowzEditProfileSheet() {
  const { c } = useGlowzTheme();
  const { closeSheet } = useGlowzSheet();
  const { profile, saveProfile } = useProfileSettings();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [err, setErr] = useState<ProfileErrors>({});
  return (
    <GlowzSheet title="Edit profile" onClose={closeSheet}>
      <View style={{ gap: 6 }}>
        <GlowzText kind="small" weight={600}>Name</GlowzText>
        <GlowzTextField value={name} onChangeText={setName} maxLength={40} autoCorrect={false} accessibilityLabel="Name" />
        {err.name ? <GlowzText kind="small" weight={500} color={c.bad}>{err.name}</GlowzText> : null}
      </View>
      <View style={{ gap: 6 }}>
        <GlowzText kind="small" weight={600}>Mobile number (optional)</GlowzText>
        <GlowzTextField value={phone} onChangeText={setPhone} maxLength={20} keyboardType="phone-pad" placeholder="+63 917 123 4567" accessibilityLabel="Mobile number" />
        {err.phone ? <GlowzText kind="small" weight={500} color={c.bad}>{err.phone}</GlowzText> : null}
      </View>
      <GlowzText kind="small" muted>Demo profile. {savedNote()} Nothing is sent to Glowz or Wantiss.</GlowzText>
      <GlowzButton label="Save" onPress={() => setErr(saveProfile(name, phone))} />
    </GlowzSheet>
  );
}
