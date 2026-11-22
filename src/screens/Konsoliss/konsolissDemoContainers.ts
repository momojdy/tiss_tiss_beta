import type {KonsolissContainerStatus} from './useCurrentKonsolissContainer';

export type KonsolissSelectableContainer = {
  id: string;
  number: string;
  status: KonsolissContainerStatus;
  demo: boolean;
  loadedCbm?: number;
  /** Customer's total reserved allocation in this container (not the loaded amount). */
  yourSpaceCbm?: number;
  /** Customer's cartons actually loaded in this container. */
  yourLoadedCbm?: number;
};

const sample = [
  // number, status, total physically loaded, customer allocated, customer physically loaded
  ['KS-DEMO-01','filling',0,0,0],
  ['KS-DEMO-02','filling',8.4,2.0,0.6],
  ['KS-DEMO-03','filling',18.7,3.0,1.2],
  ['KS-DEMO-04','filled',31.5,1.6,0.5],
  ['KS-DEMO-05','filled',48.2,4.0,2.0],
  ['KS-DEMO-06','departed',54.3,2.5,1.1],
  ['KS-DEMO-07','arrived',62.1,1.0,0.4],
  ['KS-DEMO-08','filling',67.2,0.8,0.3],
] as const;

/** Preview-only records; never persisted or interpreted as real assignments. */
export const KONSOLISS_DEMO_CONTAINERS: KonsolissSelectableContainer[] =
  sample.map(([number,status,loadedCbm,yourSpaceCbm,yourLoadedCbm])=>({
    id:'demo:'+number,number,status,demo:true,loadedCbm,yourSpaceCbm,yourLoadedCbm,
  }));
