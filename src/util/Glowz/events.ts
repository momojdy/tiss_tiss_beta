/** Tiny event bus for one-off UI commands that do not belong in persisted state. */
type Listener = () => void;
const listeners: Listener[] = [];

export const searchFocusBus = {
  subscribe(l: Listener): () => void {
    listeners.push(l);
    return () => {
      const i = listeners.indexOf(l);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
  emit(): void {
    listeners.slice().forEach((l) => l());
  },
};
