import {useEffect,useState} from 'react';
import {C,loadContent,onContent} from '../../features/Goodies/content';
import {resolveGoodiesText} from '../../features/Goodies/i18n/resolveText';
import type {LangCode,Txt} from '../../features/Goodies/data/types';
import {wantissLocale} from '../../lib/locales';
import {useApp} from './BusinessSpaceShared';
import vendorCopy from '../../features/Goodies/i18n/vendorCopy.json';

export type GoodiesVendorLabel=(id:string,fallback:string,vars?:Record<string,unknown>)=>string;
type CopyRow={id:string;page:string;t:Txt};
const copy=vendorCopy as CopyRow[];
const displayCodes:Record<string,string>={
 placed:'New order',scheduled:'Scheduled',accepted:'Accepted',preparing:'Preparing',ready:'Ready',
 courier_assigned:'Courier assigned',picked_up:'Picked up',completed:'Completed',cancelled:'Cancelled',
 declined:'Declined',expired:'Expired',pending:'Pending',paid:'Paid',authorized:'Authorized',
 requires_action:'Action required',refund_pending:'Refund pending',refunded:'Refunded',
 partially_refunded:'Partially refunded',failed:'Failed',disputed:'Disputed',dispute_won:'Dispute won',
 disputed_lost:'Dispute lost',pizza:'Pizza',burger:'Burger',custom:'Custom',
 approved:'Approved',rejected:'Rejected',submitted:'Submitted',needs_info:'Needs info',
 requires_capture:'Authorized',requires_confirmation:'Pending',requires_payment_method:'Action required',
 refund_manual_review:'Refund under review',succeeded:'Paid',unknown:'Unavailable',
};
const format=(value:string,vars?:Record<string,unknown>)=>value.replace(/\{(\w+)\}/g,(match,key)=>String(vars?.[key]??match));

export function resolveGoodiesVendorLabel(id:string,fallback:string,locale:LangCode,vars?:Record<string,unknown>):string {
 const published=C?.labels?.find((row:any)=>row.id===id);
 const row=published||copy.find(entry=>entry.id===id);
 return format(resolveGoodiesText(row?.t,locale,false)||fallback,vars);
}

export function useGoodiesVendorLabels(page='shared') {
 const app=useApp(),[,rerender]=useState(0),locale=wantissLocale(app.lang);
 useEffect(()=>{const stop=onContent(()=>rerender(value=>value+1));void loadContent();return stop;},[]);
 const label:GoodiesVendorLabel=(id,fallback,vars)=>resolveGoodiesVendorLabel(id,fallback,locale,vars);
 const text=(source:string)=>{
  const canonical=displayCodes[source]||source;
  const row=copy.find(entry=>entry.page===page&&typeof entry.t!=='string'&&entry.t.en?.v===canonical)
   ||copy.find(entry=>typeof entry.t!=='string'&&entry.t.en?.v===canonical);
  return row?label(row.id,canonical):canonical;
 };
 const money=(amount:number,currency='USD')=>new Intl.NumberFormat(locale==='ht'?'fr-HT':locale,{style:'currency',currency}).format(amount);
 const status=(code:unknown)=>text(typeof code==='string'&&displayCodes[code]?displayCodes[code]:'Under review');
 const canManage=canManageGoodiesBusiness(app.biz);
 const requireManage=()=>{
  if(canManage)return true;
  app.toast(text('Only business owners and admins can edit Goodies.'));
  return false;
 };
 return {label,text,status,money,locale,canManage,requireManage};
}

/** Mirror the membership gate; account restrictions remain authoritative on the server. */
export function canManageGoodiesBusiness(business:{role?:unknown}):boolean {
 return business.role==='owner'||business.role==='admin';
}

/** Localize option display while retaining canonical values in state/RPCs. */
export function vendorSegmentProps(items:string[],value:string,onChange:(value:string)=>void,text:(value:string)=>string) {
 return {items:items.map(key=>({k:key,l:text(key)})),value,onChange:(canonical:string)=>{
  if(items.includes(canonical))onChange(canonical);
 }};
}
