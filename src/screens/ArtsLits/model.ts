import { BOOKS, catalog, creators, exhibitions, floors, future, museums, works } from './catalog';
import { previewRouteTitle } from './homeRegistry';
export type Profile = 'returning' | 'new' | 'reader' | 'collector' | 'museum' | 'member' | 'comics';
export type Connection = 'live' | 'loading' | 'offline' | 'error' | 'empty';
export type Language = 'normal' | 'long';
export type Theme = 'light' | 'dark';
export type Category = 'All' | 'Paintings' | 'Books' | 'Sculpture' | 'Prints' | 'Photography' | 'Ceramics';
export const categories: readonly Category[] = ['All','Paintings','Books','Sculpture','Prints','Photography','Ceramics'];
export const profileOptions: readonly [Profile,string][] = [['returning','Returning customer'],['new','New customer'],['reader','Regular reader'],['collector','Art collector'],['museum','Museum enthusiast with pass'],['member','Paid member'],['comics','Comics enthusiast']];
export const connectionOptions: readonly [Connection,string][] = [['live','Normal'],['loading','Loading then recover'],['offline','Offline'],['error','Error'],['empty','Empty catalog']];
export const defaultFollowing = creators.map(c=>c[0]);
export const shelfBooks = [
  {title:'The Secret Garden',author:'F. H. Burnett',height:128,width:86,background:'#0F6F6A',reading:true},
  {title:'Jane Eyre',author:'Charlotte Brontë',height:118,width:78,background:'#9A3A1B',leaning:true},
  {title:'Leaves of Grass',author:'Walt Whitman',height:134,width:92,background:'#161616'},
  {title:'Persuasion',author:'Jane Austen',height:122,width:80,background:'#C98A3A'},
  {title:'The Waves',author:'Virginia Woolf',height:130,width:88,background:'#5B4A7A'},
] as const;
export const recentVisits = [['The Museum','museum','Floor 2 · 2 days ago'],['The Ceramics Hall','ceramics','Floor 3 · last week'],['Northern Lights','gallery','Partner gallery · 3 weeks ago','Northern Lights Gallery']] as const;
export const newBooks = [['Jane Eyre — clothbound edition','books','Sample new edition','p02'],['Persuasion — reading edition','books','Sample new edition','p09'],['The Waves','books','Literary discovery']] as const;
export const featureLinks = [['Exhibitions','DISCOVER','Exhibitions'],['Creators','MEET THEM','Creators'],['Art & objects','COLLECT','Marketplace'],['Commissions','REQUEST','Commissions'],['Museum shop','DISCOVER','Museum shop']] as const;
export const editorPicks = [['The Shape of Silence','Exhibition'],['Leaves of Grass','Poetry'],['Amara Okafor','Artist']] as const;
export function access(index:number,profile:Profile,sponsor:boolean){
  if(index<4)return 'Free';
  if(index===5&&sponsor)return 'Sponsored · Free';
  if(profile==='member'&&(index===4||index===5))return 'Included';
  if(profile==='museum'&&index===4)return 'Pass active';
  return 'Ticket';
}
export function sectionVisibility(profile:Profile,sponsor:boolean,followingCount:number){return {
  recent:['returning','museum','member'].includes(profile), shelf:['returning','reader','member'].includes(profile),
  startShelf:['new','museum','collector'].includes(profile), listening:['returning','reader','member'].includes(profile),
  following:profile!=='new'&&followingCount>0, passes:['museum','member'].includes(profile), collection:profile==='collector', offer:profile==='museum', sponsor,
};}
export function visibleProducts(category:Category,limit:number){const all=catalog.filter(p=>category==='All'||p[2]===category);return {items:all.slice(0,limit),total:all.length,hasMore:limit<all.length};}
export function effectiveConnection(preview:Connection,connected:boolean|null){return preview==='live'?(connected===false?'offline':'ready'):preview;}
export const connectionMessages={loading:'Loading your cultural edit…',offline:'Offline — showing cached sample content. Live actions are unavailable.',error:'Could not refresh the cultural edit. Showing the last available sample.',empty:'No catalog items are available in this preview state.'};
// All destinations are genuine native preview routes; no transactions, notifications, or real entitlements are implied.
export const destinations: Record<string,readonly string[]> = {
  Notifications:['Homepage notification preview. No live Wantiss notification feed is connected.'],
  'Section not shown':['This section is hidden in the current customer or layout preview. Switch to showcase or enable the section in the layout preview.','Preview controls'],
  Museum:['Choose either viewing mode. Both will use the same server-authorized admission.','Walk through the museum','Browse as gallery','Museum map','Museum discovery','Museum passes','Museum shop'],
  'The Museum':['Flagship virtual museum preview.','Walk through the museum','Browse as gallery','Museum map','Museum shop'],
  'Museum discovery':['Discover participating institutions. The names and arrangements here are fictional samples.',...museums.map(x=>x[0])],
  'Museum visit history':['Sample visit history.','The Museum','The Ceramics Hall','Northern Lights Gallery'],
  Library:['Discover books, audio and your own collection.','Public library','My Bookshelf','New literary releases','Free to read','Audiobooks'],
  'Public library':['The public library will contain searchable, licensed editions.',...BOOKS.map(x=>x[0])],
  'My Bookshelf':['Your purchased, borrowed and saved books will have separate access statuses.',...BOOKS.slice(0,5).map(x=>x[0])],
  'Continue reading':['Sample progress: Chapter 7 · 38%. The reader will be designed in the Library phase.','The Secret Garden'],
  'Continue listening':['Sample listening progress: Chapter 3 · 4h 20m left. No audio playback is available in this homepage prototype.','The Waves','Audiobooks'],
  Audiobooks:['Audiobook catalog and player are upcoming.','The Waves'],
  'New literary releases':['Illustrative new edition placements.','p02','p09','The Waves'],
  'Free to read':['Public-domain titles are illustrative; actual edition and territory rights must be validated.',...BOOKS.slice(5).map(x=>x[0])],
  Explore:['Browse cultural discovery and commercial categories.','Artworks','Literature','Exhibitions','Creators','Editor’s picks','Marketplace','Commissions'],
  Artworks:['Reference artworks.',...works.map(x=>x[0])], Literature:['Browse publications.','Public library','Audiobooks','New literary releases'],
  Me:['Your personal cultural space.','My Bookshelf','Saved','Art collection','Museum passes','Memberships','Reminders','Preview controls'],
  Exhibitions:['Current and upcoming sample exhibitions.',...exhibitions.map(x=>x[0]),...future.map(x=>x[0])],
  Creators:['Fictional profile samples; images show disciplines, not named people.',...creators.map(x=>x[0])],
  Marketplace:['Browse the finite sample catalog. No orders are placed.',...catalog.map(x=>x[0])],
  'Art collection':['Saved works are distinct from licensed ownership.','Saved','Artworks'], 'Museum shop':['Sample authorized merchandise concepts.','p01','p04','p10'],
  Commissions:['Future quotation and project workflow. No payment or request is sent.','Creators'],
  Memberships:['Optional access to participating catalogs and exhibitions. Final pricing, eligibility and terms are not approved.','Museum passes'],
  'Museum passes':['No real passes are issued in this prototype.','Museum map','Memberships'],
  'Poetry contest':['Words without walls. The competition is illustrative; rules, eligibility, prizes and dates must be approved. No submission is accepted here.'],
  'Walk through the museum':['The actual 3D experience is the next design phase. This preview does not render a navigable building.','Museum map'],
  'Browse as gallery':['The full scrollable gallery is the next design phase. Select a floor to inspect its access state.','Museum map'],
  'Image credits':['V8: 19 original bundled visual files preserved byte-for-byte, with legacy source attribution and rights review pending (assets-manifest.json). V10/V10.1: 19 original design illustrations, including the revised Ochre and form still life; no third-party images used in these illustrations (v10-assets-manifest.json). All are design references, not actual listings, venue or creator photographs. Production licensing, accuracy and attribution review remain required. V10.2 includes Met Open Access painting derivatives: Wheat Field with Cypresses (436535) and The Dance Class (438817), public domain / CC0, copied from Openhall’s documented demo image sources. See v102-assets-manifest.json for origin, size and Git blob identity.'],
};
export function titleFor(id:string){return previewRouteTitle(id)??catalog.find(x=>x[0]===id)?.[1]??id;}
export function searchCatalog(query:string){const records: [string,string][] = [...Object.keys(destinations).map(x=>[x,x] as [string,string]),...BOOKS.map(x=>[x[0],`${x[0]} · ${x[1]}`] as [string,string]),...works.map(x=>[x[0],`${x[0]} · ${x[1]}`] as [string,string]),...creators.map(x=>[x[0],`${x[0]} · ${x[1]}`] as [string,string]),...exhibitions.map(x=>[x[0],x[0]] as [string,string]),...future.map(x=>[x[0],x[0]] as [string,string]),...museums.map(x=>[x[0],x[0]] as [string,string]),...catalog.map(x=>[x[0],x[1]] as [string,string])];const q=query.trim().toLowerCase();const seen=new Set<string>();return records.filter(([id,label])=>label.toLowerCase().includes(q)&&!seen.has(id)&&!!seen.add(id));}
export type PreviewPreferences={theme:Theme;saved:string[];reminders:string[];following:string[]};
