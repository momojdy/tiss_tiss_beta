/** Tracks whether the last write to storage worked, so messages can say where data lives. */
let ok = true;
export const setStorageOk = (v: boolean): void => {
  ok = v;
};
export const savedNote = (): string => (ok ? 'Saved on this device.' : 'Kept for this session only.');
