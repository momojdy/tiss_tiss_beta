import React from 'react';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { usePrezoToast } from '../../../features/prezo/PrezoToastContext';
import type { Campaign } from '../../../types/prezo';
import { Button } from '../shared/Button';
import { PzText } from '../shared/PzText';
import { Sheet, SheetActions } from '../shared/Sheet';
import { TextField } from '../shared/TextField';

interface ShareSheetProps {
  campaign: Campaign | null;
  onClose: () => void;
}

export const ShareSheet = ({ campaign, onClose }: ShareSheetProps) => {
  const toast = usePrezoToast();
  const url = campaign?.shareUrl ?? null;

  const copy = async () => {
    if (!url) return;
    try {
      await Clipboard.setStringAsync(url);
      toast.show('Link copied');
    } catch {
      toast.show('Copy failed. Select the link manually.');
    }
    onClose();
  };

  const shareVia = async () => {
    if (!campaign || !url) return;
    try {
      await Share.share({ message: `${campaign.title} ${url}`, url });
    } catch {
      toast.show('Sharing isn’t available right now.');
    }
    onClose();
  };

  return (
    <Sheet visible={!!campaign} onClose={onClose} title="Share campaign">
      <PzText size={13} tone="mu" style={{ marginTop: 8, marginBottom: 14 }}>
        {campaign?.mode === 'preorder'
          ? 'Sharing doesn’t reserve anything.'
          : 'Sharing doesn’t count toward the target.'}
      </PzText>
      {url ? (
        <>
          <TextField value={url} editable={false} selectTextOnFocus />
          <SheetActions>
            <Button label="Copy link" onPress={copy} />
            <Button label="Share via…" variant="ghost" onPress={shareVia} />
          </SheetActions>
        </>
      ) : (
        <PzText size={14} tone="mu">
          A share link isn’t available for this campaign.
        </PzText>
      )}
    </Sheet>
  );
};

