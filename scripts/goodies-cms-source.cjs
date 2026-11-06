const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/features/Goodies');
const pageNames = {WantissEntry:'Wantiss entry',GroupOrderSheet:'Group orders',GroupOrderModal:'Group orders',ScheduleSheet:'Scheduling',ScheduleInline:'Scheduling',SegSchedule:'Scheduling',ReviewSheet:'Review sheet',ContactsSheet:'Contact numbers sheet',CtForm:'Contact number form',Home:'Home',Cats:'Categories',CatList:'Category / store results',Explore:'Explore',Search:'Search',Promos:'Promotions',FlashDeals:'Flash deals',Notifs:'Notifications',Store:'Store',StoreReviews:'Store reviews',Product:'Product',ProductFoot:'Product',Cart:'Cart',Checkout:'Checkout',CheckoutFoot:'Checkout',Confirm:'Order confirmation',Track:'Order tracking',Orders:'Order history',Favs:'Favorites',Help:'Help / FAQs',Settings:'Settings',Profile:'Profile',Addresses:'Addresses',Contact:'Contact support',StoreChat:'Store conversation',LivePayments:'Payment methods',CardAuthentication:'Card verification',ByoScreen:'Build Your Own',ByoFoot:'Build Your Own',GoodiesCourierScreen:'Courier',GroupOrderPage:'Group orders',ImportSheet:'Preview import',Sheets:'Sheets and bottom sheets',GoodiesApp:'Shared navigation and access states',Account:'Account subpages',WalletAddNewCardScreen:'Add card'};
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory()?files(path.join(dir,entry.name)):/\.tsx?$/.test(entry.name)?[path.join(dir,entry.name)]:[]); }
function pageFor(node, ast, rel) {
  for(let ancestor=node.parent;ancestor;ancestor=ancestor.parent) if(ts.isIfStatement(ancestor)&&rel==='components/Sheets.tsx'){const kind=/^k === ['"]([^'"]+)['"]$/.exec(ancestor.expression.getText(ast));if(kind) return 'Sheets · '+kind[1];}
  if(rel.endsWith('WalletAddNewCardScreen.tsx')) return 'Add card';
  let name='';
  for(let p=node.parent;p;p=p.parent) if(ts.isFunctionDeclaration(p)&&p.name) name=p.name.text;
  return pageNames[name] || (rel.startsWith('builders/')?'Build Your Own':rel.startsWith('screens/')?path.basename(rel,'.tsx')+' · shared':rel==='actions.ts'?'Shared actions and validation':rel==='store.ts'?'Shared state messages':'Shared components');
}
function analyze() {
 const entries=new Map(),references=[],routes=[],restrictionTexts=new Map(),interfaceStrings={};
 const dictionary=ts.createSourceFile('i18n/index.ts',fs.readFileSync(path.join(root,'i18n/index.ts'),'utf8'),99,true);
 function readDictionary(node){if(ts.isVariableDeclaration(node)&&node.name.getText(dictionary)==='en'&&node.initializer&&ts.isObjectLiteralExpression(node.initializer))for(const prop of node.initializer.properties)if(ts.isPropertyAssignment(prop)&&ts.isStringLiteralLike(prop.initializer))interfaceStrings[prop.name.getText(dictionary)]=prop.initializer.text;ts.forEachChild(node,readDictionary);}readDictionary(dictionary);
 const fallbackOf=node=>ts.isStringLiteralLike(node)?node.text:ts.isCallExpression(node)&&/^(tr|t)$/.test(node.expression.getText())&&node.arguments[0]&&ts.isStringLiteralLike(node.arguments[0])?interfaceStrings[node.arguments[0].text]:undefined;
 const add=(id,text,page,source,line)=>{
  if(!entries.has(id))entries.set(id,{id,text,pages:[]});
  const entry=entries.get(id);if(!entry.pages.includes(page))entry.pages.push(page);
  references.push({id,page,source,line,fallback:text});
 };
 for(const filename of [...files(root),path.resolve(root,'../../screens/Wallet/WalletAddNewCardScreen.tsx')]){
  const source=fs.readFileSync(filename,'utf8'),ast=ts.createSourceFile(filename,source,99,true),rel=path.relative(root,filename);
  function visit(node){
   const line=ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1;
   if(ts.isCallExpression(node)&&/^(label|cmsLabel|cardText)$/.test(node.expression.getText(ast))&&node.arguments.length>=2&&ts.isStringLiteralLike(node.arguments[0])&&fallbackOf(node.arguments[1])!==undefined) add(node.arguments[0].text,fallbackOf(node.arguments[1]),pageFor(node,ast,rel),rel,line);
   if(ts.isCallExpression(node)&&/^(tr|t)$/.test(node.expression.getText(ast))&&node.arguments[0]&&ts.isStringLiteralLike(node.arguments[0])&&interfaceStrings[node.arguments[0].text])add('lbl.interface.'+node.arguments[0].text,interfaceStrings[node.arguments[0].text],pageFor(node,ast,rel),rel,line);
   if(ts.isCallExpression(node)&&node.expression.getText(ast)==='rgText'&&node.arguments.slice(0,2).every(ts.isStringLiteralLike)) restrictionTexts.set(node.arguments[0].text,{id:node.arguments[0].text,text:node.arguments[1].text});
   if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='en'&&rel==='i18n/index.ts'&&node.initializer&&ts.isObjectLiteralExpression(node.initializer)) for(const prop of node.initializer.properties) if(ts.isPropertyAssignment(prop)&&ts.isStringLiteralLike(prop.initializer))add('lbl.interface.'+prop.name.getText(ast),prop.initializer.text,'Shared navigation and interface',rel,line);
   if(ts.isCaseClause(node)&&ts.isStringLiteral(node.expression)&&['GoodiesApp.tsx','screens/Account.tsx'].includes(rel)){
     const body=node.statements.map(s=>s.getText(ast)).join(' '),component=[...body.matchAll(/<([A-Z][A-Za-z]+)/g)].map(match=>match[1]).find(name=>pageNames[name]);
     routes.push({route:node.expression.text,page:pageNames[component]||({supdone:'Support confirmation',policies:'Policies',policy:'Policy document',ndetail:'Notification detail',seller:'Merchant information',sellerEdit:'Merchant settings'}[node.expression.text])||node.expression.text,source:rel,line});
   }
   ts.forEachChild(node,visit);
  }visit(ast);
 }
 for(const entry of JSON.parse(fs.readFileSync(path.join(root,'i18n/notificationCatalog.json'),'utf8')))add(entry.id,entry.text,'Notification templates','i18n/notificationCatalog.json',1);
 for(const [id,text,page] of [['lbl.legalTermsTitle','Terms of use','Policies'],['lbl.legalPrivacyTitle','Privacy policy','Policies'],['lbl.legalRefundTitle','Refund and cancellation policy','Policies'],...['Home','Work','Other'].map(text=>['lbl.accountAddressType'+text,text,'Addresses']),...['Order placed','Vendor confirmed','Preparing order','Ready for courier pickup','Courier assigned','On the way','Delivered'].map((text,index)=>['lbl.stageD'+index,text,'Order tracking']),...['Order placed','Vendor confirmed','Preparing order','Ready for pickup','Picked up'].map((text,index)=>['lbl.stageP'+index,text,'Order tracking'])])add(id,text,page,'explicit dynamic keys',1);
 const collections={Home:['modes','cats','promos'],Categories:['cats'],'Category / store results':['cats'],Promotions:['coupons.title','coupons.desc'],'Build Your Own':['lib','separate existing builder configuration editor'],'Help / FAQs':['faq'],'Contact support':['topics'],Policies:['legal'],'Policy document':['legal'],'Sheets · alcrules':['rg.texts'],'Sheets · promo':['promos']};
 const pages=[...new Set([...routes.map(r=>r.page),...references.map(r=>r.page),'Support confirmation','Policies','Policy document','Notification detail'])].map(name=>({name,collections:collections[name]||[],routes:routes.filter(r=>r.page===name).map(r=>r.route),fields:[...entries.values()].filter(e=>e.pages.includes(name)).map(e=>e.id)}));
 // Inline Account switch subpages share the same rendering function; explicitly
 // associate their existing dynamic label keys with each actual route.
 const accountSubpages={Policies:['lbl.profilePolicies','lbl.legalTermsTitle','lbl.legalPrivacyTitle','lbl.legalRefundTitle'], 'Policy document':['lbl.legalTermsTitle','lbl.legalPrivacyTitle','lbl.legalRefundTitle','lbl.legalUnavailableTitle','lbl.legalUnavailableBody','lbl.legalPolicyTitle'], 'Notification detail':['lbl.accountNotificationTitle','lbl.accountViewOrder','lbl.accountSeeDetails'], 'Support confirmation':['lbl.accountSupportSentTitle','lbl.accountStoreTicketSent','lbl.accountDemoTicketSent','lbl.accountOpenStoreConversation','lbl.accountBackGoodies']};
 for(const [name,ids] of Object.entries(accountSubpages)){const page=pages.find(p=>p.name===name);if(page)page.fields=[...new Set([...page.fields,...ids])];}
 return {restrictionTexts:[...restrictionTexts.values()],entries:[...entries.values()].sort((a,b)=>a.id.localeCompare(b.id)),pages,references,routes};
}
module.exports={analyze,root};
