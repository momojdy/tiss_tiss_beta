import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
import {fetchPublishedWantissContent} from '../../lib/wantissCms';

export const KONSOLISS_CONTENT_KEY='konsoliss.content';
export const KONSOLISS_COPY_DEFAULTS:Record<string,string>={
 'header.stripeColor':'#FFD93D',
 'home.brand':'Konsoliss','home.load.heading':'My current load','home.available':'available',
 'home.otherCargo':'Other cargo','home.yourSpace':'Your space','home.free':'Free',
 'home.book.title':'Book Space','home.book.subtitle':'Reserve container capacity',
 'home.load.title':'Load Items','home.load.subtitle':'Move warehouse goods',
 'home.calc.title':'CBM Calculator','home.calc.subtitle':'Calculate your package volume',
 'home.warehouse.title':'Warehouse','home.packages.received':'packages received',
 'home.packages.ready':'ready to load','home.consolidated.title':'Consolidated',
 'home.departure':'Est. departure:','home.sourcing.title':'Sourcing+',
 'home.sourcing.subtitle':'Find products, compare prices, get them delivered',
 'home.how.heading':'How consolidation works',
 'home.how.1.title':'Book Space',
 'home.how.1.body':'Reserve the CBM you need for your shipment.\nStarting from 0.02 CBM',
 'home.how.2.title':'Inbound to warehouse',
 'home.how.2.body':'Buy on WANTISS, \npaste a product link \nfor us to purchase,\nor ship external items \nto our warehouse.',
 'home.how.3.title':'Items processing',
 'home.how.3.body':'We verify incoming items \nand optimize packaging \nwhen needed',
 'home.how.4.title':'Load items',
 'home.how.4.body':'Allocate items \nto your reserved space',
 'home.how.5.title':'Container departs',
 'home.how.5.body':'Your orders are shipped \nand delivered to you \nor ready for pickup \nat a designated location',
 'book.heading':'Book Space','book.review':'Review',
 'calc.heading':'CBM calculator','calc.instructions':'Enter size in cm',
 'calc.length':'Length','calc.width':'Width','calc.height':'Height','calc.quantity':'Quantity',
 'nav.home':'Home','nav.warehouse':'Warehouse','nav.consolidated':'Konso',
 'nav.sourcing':'Sourcing+','nav.hub':'Hub',
 'warehouse.heading':'Warehouse','consolidated.heading':'Consolidated','sourcing.heading':'Sourcing+','hub.heading':'Hub'
};
export type KonsolissCopy=Record<string,string>;
let latest:KonsolissCopy=KONSOLISS_COPY_DEFAULTS;
export function useKonsolissCopy(locale='en'):KonsolissCopy{
 const [copy,setCopy]=useState<KonsolissCopy>(latest);
 useEffect(()=>{
   let active=true;
   const reload=async()=>{
     try{
       const published=await fetchPublishedWantissContent(locale);
       const row=published.content.filter(record=>record.content_key===KONSOLISS_CONTENT_KEY).sort((a,b)=>b.version-a.version)[0];
       const labels=row?.payload?.labels;
       if(!labels||typeof labels!=='object'||Array.isArray(labels))return;
       const valid=Object.fromEntries(Object.entries(labels).filter(([k,v])=>Object.prototype.hasOwnProperty.call(KONSOLISS_COPY_DEFAULTS,k)&&typeof v==='string'&&v.trim()));
       latest={...KONSOLISS_COPY_DEFAULTS,...valid};if(active)setCopy(latest);
     }catch{/* Keep existing built-in or last fetched copy when offline. */}
   };
   void reload();
   const listener=AppState.addEventListener('change',state=>{if(state==='active')void reload();});
   return()=>{active=false;listener.remove();};
 },[locale]);
 return copy;
}
