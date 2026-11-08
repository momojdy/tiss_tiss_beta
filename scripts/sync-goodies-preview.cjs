/* Mirror current customer components into the existing isolated CMS preview.
 * Native/provider boundaries and preview transports stay in the admin repo.
 * This script never deploys or publishes content. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require('typescript');
const customer=path.resolve(__dirname,'..'),admin=path.resolve(customer,'../tiss-admin'),target=path.join(admin,'src/features/admin/goodiesConsumer');
const copies=[];
function write(relative,source,origins){const file=path.join(target,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,source);copies.push({target:relative,origins:origins.map(origin=>({file:origin,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(customer,origin))).digest('hex')}))});}
function declarations(file,names){const source=fs.readFileSync(path.join(customer,file),'utf8'),ast=ts.createSourceFile(file,source,99,true);return ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast)).join('\n\n');}
const group='src/features/Goodies/components/Sheets.tsx';
write('screens/GroupOrders.tsx',`// Generated from the customer components; local adapters prohibit production side effects.\nimport React,{useState,useEffect,useMemo} from 'react';
import {View,Pressable,ScrollView,Image,useWindowDimensions,PanResponder} from 'react-native';
import {T,Cta,Row,Card,Badge,Input,Radio,Seg,Bar,useTheme} from '../components/ui';
import {Icon} from '../components/Icon';
import {label} from '../content';
import {S,STB,money,emit,save,toast,addr,phoneOK} from '../store';
import * as A from '../actions';
import {previewBackend as supabase,previewShare as Share,previewFriendlyError as friendlyError} from '../previewRuntime';
import {CameraView,useCameraPermissions,Modal} from '../previewNative';
import {syncGroupOrderCartLine,removeGroupOrderCartLine,refreshUserAddresses,clearActiveGroup,validateActiveGroup,previewPaymentOptions} from '../previewGroups';
import QRCode from 'react-native-qrcode-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomSheet} from '../components/Overlays';\n\n`+declarations(group,['GroupOrderModal','GroupOrderSheet','GroupOrderPage']).replace('await A.refreshPaymentOptions()','await previewPaymentOptions()')+'\n',[group]);
const card='src/features/Goodies/screens/CardAuthentication.tsx';write('screens/CardAuthentication.tsx',fs.readFileSync(path.join(customer,card),'utf8').replace("from 'react-native-webview'","from '../previewNative'"),[card]);
const wallet='src/screens/Wallet/WalletAddNewCardScreen.tsx';let s=fs.readFileSync(path.join(customer,wallet),'utf8');s=s.replace("from 'react-native-webview'","from '../previewNative'").replace("from '../../lib/supabase'","from '../previewRuntime'").replace("import { supabase }", "import { previewBackend as supabase }").replace("from '../../lib/functionError'", "from '../previewRuntime'").replace("import { functionErrorMessage }", "import { previewFunctionError as functionErrorMessage }").replace('<WebView<{}>','<WebView').replace('useRef<ScrollView>','useRef<React.ElementRef<typeof ScrollView>>').replace('useRef<TextInput>','useRef<React.ElementRef<typeof TextInput>>');
s="import {usePreviewScenario} from '../previewNative';\n"+s;s=s.replace('  const insets = useSafeAreaInsets();','  const insets = useSafeAreaInsets();\n  const previewScenario=usePreviewScenario();',1).replace('const [processing, setProcessing] = useState(false)','const [processing, setProcessing] = useState([\'saving\',\'success\'].includes(previewScenario))').replace('const [success, setSuccess] = useState(false)','const [success, setSuccess] = useState(previewScenario===\'success\')');s=s.replace('const proc = useRef(new Animated.Value(0))', "const proc = useRef(new Animated.Value(['saving','success'].includes(previewScenario)?1:0))").replace('const okAnim = useRef(new Animated.Value(0))', "const okAnim = useRef(new Animated.Value(previewScenario==='success'?1:0))");write('screens/AddCard.tsx',s,[wallet]);
const ui='src/features/Goodies/components/ui.tsx';s=fs.readFileSync(path.join(customer,ui),'utf8');s="import {Sel,useEditableText,type GoodiesSelection} from '../editContext';\nimport {editLocked} from '../store';\n"+s;
s=s.replace('color, lines, align}:','color, lines, align, cmsKey, cmsKeys}:').replace('align?: any})','align?: any; cmsKey?:string; cmsKeys?:string[]})');s=s.replace('<Text numberOfLines={lines}', '<Text {...useEditableText(children,cmsKey,cmsKeys)} numberOfLines={lines}');
s=s.replace('onBack, stripe = true}:','onBack, stripe = true, cmsKey}:').replace('stripe?: boolean})','stripe?: boolean;cmsKey?:string})');s=s.replace('<Text numberOfLines={1}', '<Text {...useEditableText(title,cmsKey)} numberOfLines={1}');
s=s.replace('disabled, small}:','disabled, small, cmsKey, cmsKeys}:').replace('small?: boolean})','small?: boolean;cmsKey?:string;cmsKeys?:string[]})');const ci=s.indexOf('export function Cta');s=s.slice(0,ci)+s.slice(ci).replace('  const th = useTheme();','  const th = useTheme();\n  const editable=useEditableText(label,cmsKey,cmsKeys);',1).replace('<Pressable disabled={disabled} onPress={onPress}', '<Pressable disabled={editable.onPress?false:disabled} onPress={editable.onPress||onPress}',1);
s=s.replace('multiline, keyboard}:','multiline, keyboard, cmsKey, cmsPlaceholderKey}:').replace('keyboard?: any})','keyboard?: any;cmsKey?:string;cmsPlaceholderKey?:string})');const ii=s.indexOf('export function Input');s=s.slice(0,ii)+s.slice(ii).replace('  const th = useTheme();','  const th = useTheme();\n  const editable=useEditableText(placeholder,cmsPlaceholderKey);',1).replace('<T size={13} weight="600"','<T cmsKey={cmsKey} size={13} weight="600"',1).replace('<TextInput value={value}', '<TextInput editable={!editLocked} onPressIn={editable.onPress} value={value}',1);s=s.replace('onLink, right}:','onLink, right, sel}:').replace('onLink?: () => void; right?: any})','onLink?: () => void; right?: any;sel?:GoodiesSelection})');
 s=s.replace('{title}</T>', '{title}</T>');
 const shStart=s.indexOf('export function Sh('),shEnd=s.indexOf('export const Rail',shStart);
 s=s.slice(0,shStart)+s.slice(shStart,shEnd).replace('<T size={18}', '<T cmsKey={sel?.id} size={18}')+s.slice(shEnd);
 // A transparent hit target works even when the native input is disabled in edit mode.
 s=s.replace('<TextInput editable={!editLocked}', '<View><TextInput editable={!editLocked}').replace("textAlignVertical: multiline ? 'top' : 'center'}} />", "textAlignVertical: multiline ? 'top' : 'center'}} />{editLocked && editable.onPress ? <Pressable accessibilityLabel={'Edit '+(cmsPlaceholderKey||'placeholder')} onPress={editable.onPress} style={{position:'absolute',top:0,left:0,right:0,bottom:0}} /> : null}</View>");
 s=s.replace('export function Grad(', `function safeChildren(children:any):any {return React.Children.map(children,child=>typeof child==='string'||typeof child==='number'?<T>{String(child)}</T>:child);}
export function Grad(`).replace('{children}</LinearGradient>', '{safeChildren(children)}</LinearGradient>');
 s=s.replaceAll('{children}</View>', '{safeChildren(children)}</View>').replaceAll('{children}</ScrollView>', '{safeChildren(children)}</ScrollView>').replace('      {children}\n    </View>', '      {safeChildren(children)}\n    </View>');
 s=s.replace('<T cmsKey={sel?.id} size={18} weight="600" style={{flexShrink: 1}}>{title}</T>', '{sel ? <Sel sel={sel} style={{flexShrink:1}}><T size={18} weight="600">{title}</T></Sel> : <T size={18} weight="600" style={{flexShrink:1}}>{title}</T>}');
 write('components/ui.tsx',s,[ui]);
const overlays='src/features/Goodies/components/Overlays.tsx';s=fs.readFileSync(path.join(customer,overlays),'utf8').replace('{Modal, View','{View');s="import {Modal} from '../previewNative';\n"+s;write('components/Overlays.tsx',s,[overlays]);
// Explicit identities are added without changing expressions, strings, or visual attributes.
function instrument(file){let source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,99,true),edits=[];
 function ids(node){const out=[];function walk(n){if(ts.isCallExpression(n)&&['label','cmsText','cmsLabel','cardText'].includes(n.expression.getText(ast))&&n.arguments[0])out.push(n.arguments[0].getText(ast));ts.forEachChild(n,walk);}walk(node);return [...new Set(out)];}
 function attrId(init){if(!init||!ts.isJsxExpression(init)||!init.expression)return[];return ids(init.expression);}
 function visit(node){if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)){
  const open=ts.isJsxElement(node)?node.openingElement:node,tag=open.tagName.getText(ast),props=open.attributes.properties,existing=new Set(props.filter(ts.isJsxAttribute).map(a=>a.name.getText(ast)));let add='';
  if(['T','Text','EditableNativeText'].includes(tag)&&!existing.has('cmsKey')&&!existing.has('cmsKeys')){const keys=ts.isJsxElement(node)?node.children.filter(ts.isJsxExpression).flatMap(ids):[];const unique=[...new Set(keys)];if(unique.length)add=unique.length===1?` cmsKey={${unique[0]}}`:` cmsKeys={[${unique.join(',')}]}`;}
  if(['Cta','Input','Bar'].includes(tag)){for(const prop of props){if(!ts.isJsxAttribute(prop))continue;const name=prop.name.getText(ast),dest=tag==='Bar'&&name==='title'?'cmsKey':name==='label'?'cmsKey':tag==='Input'&&name==='placeholder'?'cmsPlaceholderKey':'';if(!dest||existing.has(dest))continue;const keys=attrId(prop.initializer);if(keys.length===1)add+=` ${dest}={${keys[0]}}`;else if(keys.length>1&&tag==='Cta'&&!existing.has('cmsKeys'))add+=` cmsKeys={[${keys.join(',')}]}`;}}
  if(add)edits.push({pos:open.tagName.end,text:add});
 }ts.forEachChild(node,visit);}visit(ast);
 // Native Text gains the same selection semantics as the existing T primitive.
 let hasText=false;function imports(n){if(ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='react-native'&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)){for(const el of n.importClause.namedBindings.elements)if(el.name.text==='Text'&&!el.propertyName){hasText=true;edits.push({pos:el.getStart(ast),end:el.end,text:'Text as UnusedNativeText'});}}ts.forEachChild(n,imports);}if(!file.endsWith('/components/ui.tsx'))imports(ast);
 edits.sort((a,b)=>b.pos-a.pos);for(const e of edits)source=source.slice(0,e.pos)+e.text+source.slice(e.end||e.pos);
 if(hasText){const rel=path.relative(path.dirname(file),path.join(target,'EditableNativeText')).replaceAll(path.sep,'/');source=`import {EditableNativeText as Text} from '${rel.startsWith('.')?rel:'./'+rel}';\n`+source;}
 fs.writeFileSync(file,source);
}
for(const relative of ['screens/GroupOrders.tsx','screens/CardAuthentication.tsx','screens/AddCard.tsx','screens/Shop.tsx','screens/Account.tsx','screens/Browse.tsx','screens/Payments.tsx','components/Sheets.tsx','components/cards.tsx','builders/Builder.tsx'])instrument(path.join(target,relative));
fs.writeFileSync(path.join(target,'previewSourceManifest.json'),JSON.stringify({scope:'Source mirroring and native/provider adapter boundaries; not hosted verification',copies},null,2)+'\n');
console.log('Mirrored customer group/card components, UI primitives and overlays; instrumented exact CMS identities.');

// All mirrored backend and device persistence calls are confined to local ports.
function harden(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())harden(file);else if(/\.tsx?$/.test(file)){let value=fs.readFileSync(file,'utf8');const rel=path.relative(path.dirname(file),path.join(target,'previewRuntime')).replaceAll(path.sep,'/');const port=rel.startsWith('.')?rel:'./'+rel;value=value.replace(/import\s*{\s*supabase\s*}\s*from\s*['"][^'"]*lib\/supabase['"];?/g,`import {previewBackend as supabase} from '${port}';`).replace(/import AsyncStorage from ['"]@react-native-async-storage\/async-storage['"];?/g,`import {previewStorage as AsyncStorage} from '${port}';`);value=value.replace(/import\s*{fetchPublishedWantissContent}\s*from\s*['"][^'"]*lib\/wantissCms['"];?/g,`import {previewPublishedContent as fetchPublishedWantissContent} from '${port}';`);fs.writeFileSync(file,value);}}}
harden(target);
