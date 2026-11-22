import type {KonsolissContainerStatus} from './useCurrentKonsolissContainer';

/** Customer-facing explanations. Status values are server-owned and read-only. */
export const KONSOLISS_LIFECYCLE_MESSAGES: Record<KonsolissContainerStatus, {title:string;description:string}> = {
  filling: {
    title:'Container filling',
    description:'Your container is currently accepting and loading cargo. You can follow its progress while space is available.',
  },
  filled: {
    title:'Container filled',
    description:'Loading for this container is complete and no more cargo can be added. It is being prepared for departure.',
  },
  departed: {
    title:'Container departed',
    description:'Your container has left its departure location and is on the way to its destination. You can follow its shipment progress here.',
  },
  arrived: {
    title:'Container arrived',
    description:'Your container has reached its destination. Individual packages may still need customs processing, delivery, or pickup.',
  },
};
