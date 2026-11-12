import {wantissLocale} from '../lib/locales';
import {supabase} from '../lib/supabase';
export const GOODIES_PAYOUT_METHODS = ['wal','moncash','natcash','gcash','bank'] as const;
export type GoodiesPayoutMethod = typeof GOODIES_PAYOUT_METHODS[number];
export type SettlementSummary = {currency:'USD';wallet_ready:boolean;business_id:string;available:number;pending:number;reserved:number;paid_out:number;recovery_due:number;commission_due:number;commission_credit:number;cash_sales_htg:number;cash_sales_limit_htg:number;settlement_due_at:string|null;cash_paused:boolean;hold_hours:number;settlement_days:number};
export type PayoutDestination = {id:string;method:GoodiesPayoutMethod;country:string;masked:string;status:string;usable:boolean};
export type PayoutOptions = {channels:{method:GoodiesPayoutMethod;enabled:boolean}[];destinations:PayoutDestination[];cash_enabled:boolean;rates:{currency:string;rate:string|number;expires_at:string}[]};
export type SettlementEntry = {id:string;label:string;type:string;amount:number;status:string;method:string|null;created_at:string;details?:{eta_from:string;eta_to:string;receive_amount:number;receive_currency:string}|null};
export class GoodiesSettlementError extends Error {constructor(public code='unavailable'){super('Could not complete this Goodies settlement request. Please try again.');}}
async function call<T>(name:string,args:Record<string,unknown>):Promise<T>{
 let response;try{response=await supabase.rpc(name,args);}catch{throw new GoodiesSettlementError();}
 if(response.error)throw new GoodiesSettlementError(['P4001','P4101','P4102','P4103'].includes(response.error.code)?response.error.code:'unavailable');
 return response.data as T;
}
export function parseSettlementSummary(raw:any):SettlementSummary{
 if(!raw||raw.currency!=='USD'||typeof raw.wallet_ready!=='boolean'||typeof raw.cash_paused!=='boolean'||typeof raw.business_id!=='string'||(raw.settlement_due_at!=null&&!Number.isFinite(Date.parse(raw.settlement_due_at))))throw Error('Goodies settlement details are unavailable.');
 const fields=['available','pending','reserved','paid_out','recovery_due','commission_due','commission_credit','cash_sales_htg','cash_sales_limit_htg','hold_hours','settlement_days'];
 const next={...raw};for(const key of fields){const value=raw[key];if(!['number','string'].includes(typeof value)||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0)throw Error('Goodies settlement details are unavailable.');next[key]=Number(value);}
 return next;
}
export async function getGoodiesSettlement(business:string){const result=parseSettlementSummary(await call('goodies_vendor_settlement_summary',{p_business:business}));if(result.business_id!==business)throw new GoodiesSettlementError();return result;}
export async function getGoodiesPayoutOptions(business:string):Promise<PayoutOptions>{const raw=await call<PayoutOptions>('goodies_vendor_payout_options',{p_business:business});if(!Array.isArray(raw?.channels)||!Array.isArray(raw?.destinations)||!Array.isArray(raw?.rates)||typeof raw.cash_enabled!=='boolean'||raw.channels.some(row=>!GOODIES_PAYOUT_METHODS.includes(row.method)||typeof row.enabled!=='boolean')||raw.destinations.some(row=>typeof row.id!=='string'||!GOODIES_PAYOUT_METHODS.includes(row.method)||typeof row.masked!=='string'||!['pending','verified','rejected'].includes(row.status))||raw.rates.some(row=>!Number.isFinite(Number(row.rate))||Number(row.rate)<=0||!Number.isFinite(Date.parse(row.expires_at))))throw Error('Goodies payout methods are unavailable.');return raw;}
export async function getGoodiesSettlementLedger(business:string,offset=0,type:string|null=null){const rows=await call<SettlementEntry[]>('goodies_vendor_settlement_ledger',{p_business:business,p_offset:offset,p_limit:30,p_type:type});if(!Array.isArray(rows))throw Error('Goodies transactions are unavailable.');return rows;}
export const requestGoodiesPayout=(business:string,amount:number,method:GoodiesPayoutMethod,destination:string|null,key:string,expectedReceive:number)=>call<{id:string;status:string;receive_amount:number;receive_currency:string}>('goodies_request_vendor_payout',{p_business:business,p_amount:amount,p_method:method,p_destination:destination,p_key:key,p_expected_receive:expectedReceive});
export const payGoodiesCommission=(business:string,key:string)=>call<{id:string;amount:number;status:string}>('goodies_pay_cash_commission',{p_business:business,p_key:key});
export const setGoodiesCashAcceptance=(business:string,enabled:boolean)=>call('goodies_vendor_set_cash_acceptance',{p_business:business,p_enabled:enabled});
export async function registerGoodiesDestination(business:string,method:string,country:string,holder:string,details:Record<string,string>){const id=await call<string>('goodies_register_payout_destination',{p_business:business,p_method:method,p_country:country,p_holder:holder,p_details:details});if(typeof id!=='string'||!id)throw new GoodiesSettlementError();return id;}
export const isGoodiesBusiness=(app:any)=>!!app.biz?.goodies_store_id||app.meta?.feats?.some((row:any)=>row.feature==='goodies');

export const isGoodiesOnlyBusiness=(app:any)=>isGoodiesBusiness(app)&&(app.meta?.feats||[]).every((row:any)=>row.feature==='goodies');
export async function getBusinessFinancialSummary(app:any){if(isGoodiesOnlyBusiness(app)){const data=await call<any>('goodies_vendor_dashboard_range',{p_business:app.biz.id,p_from:app.range.from,p_to:app.range.to});parseSettlementSummary(data);if(data.business_id!==app.biz.id||!Number.isFinite(Number(data.revenue)))throw Error('Goodies financial summary unavailable.');return data;}return call<any>('dashboard_range',{p_business:app.biz.id,p_from:app.range.from,p_to:app.range.to,p_feature:null});}
export const ensureGoodiesWallet=()=>call('ensure_my_wallet',{});

export async function saveGoodiesVendorLanguage(user:string,language:string){const {data,error}=await supabase.auth.getUser();if(error||data.user?.id!==user)throw new GoodiesSettlementError();const result=await supabase.from('user_settings').upsert({user_id:user,language:wantissLocale(language)},{onConflict:'user_id'});if(result.error)throw new GoodiesSettlementError();}

/** Match PostgreSQL's positive decimal rounding without floating-point quote drift. */
export function quoteGoodiesReceive(amount:string,rate:string|number):number{
 const rateText=String(rate);
 if(!/^\d+(\.\d{1,2})?$/.test(amount)||!/^\d+(\.\d{1,8})?$/.test(rateText))return NaN;
 const [whole,fraction='']=amount.split('.'),[rateWhole,rateFraction='']=rateText.split('.');
 const cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 const scaled=BigInt(rateWhole)*100000000n+BigInt(rateFraction.padEnd(8,'0'));
 const converted=(cents*scaled+50000000n)/100000000n;
 return converted<=BigInt(Number.MAX_SAFE_INTEGER)?Number(converted)/100:NaN;
}
