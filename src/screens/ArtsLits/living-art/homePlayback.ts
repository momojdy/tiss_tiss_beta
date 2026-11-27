import atlas from './home-motion-atlas.json';
export const homePlayback=atlas;
export function homeFrameAt(elapsed:number){
 'worklet';
 const t=((elapsed%atlas.durationMs)+atlas.durationMs)%atlas.durationMs;
 for(let i=0;i<atlas.frameEndsMs.length;i++)if(t<atlas.frameEndsMs[i])return i;
 return 0;
}
