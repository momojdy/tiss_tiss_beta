/** One origin policy for every feature: mixed or unknown origins use magenta. */
export const UNKNOWN_COLOR = '#BD279F';
export const FEATURE_COLORS: Record<string,string> = {
  goodies:'#FD802E', gatherz:'#A36BE8', flyz:'#4A67B0', wallet:'#81C56C',
  frenzies:'#B3DF4B', konsoliss:'#DDB52B', woulib:'#FEC509', stayz:'#579BC7', glowz:'#D49E2B',
};
export function featureColor(feature:unknown):string {
  return FEATURE_COLORS[String(feature ?? '').trim().toLowerCase()] ?? UNKNOWN_COLOR;
}
export function aggregateColor(colors:string[]):string {
  const origins = new Set(colors);
  return origins.size === 1 ? [...origins][0] : UNKNOWN_COLOR;
}
export type UnreadSummary = {
  notifications:number; messages:number; notificationColors:string[]; messageColors:string[];
};
export const EMPTY_UNREAD:UnreadSummary = {notifications:0,messages:0,notificationColors:[],messageColors:[]};

/** Keyset pagination avoids the API row limit, including exact full pages. */
export async function collectPages<T extends {id:string}>(read:(after:string|null)=>Promise<{data:T[]|null;error:unknown}>, pageSize=250):Promise<T[]> {
  const rows:T[]=[];
  let after:string|null=null;
  for (;;) {
    const result=await read(after);
    if(result.error)throw result.error;
    if(!Array.isArray(result.data))throw new Error('Unread data unavailable');
    const page=result.data;
    rows.push(...page);
    if(page.length<pageSize)return rows;
    const next=page[page.length-1].id;
    if(next===after)throw new Error('Unread pagination did not advance');
    after=next;
  }
}

/** Latest result wins; invalidate synchronously on auth changes and disposal. */
export function createRequestGate() {
  let generation=0;
  return {begin:()=>++generation, invalidate:()=>{generation++;}, current:(id:number)=>id===generation};
}
