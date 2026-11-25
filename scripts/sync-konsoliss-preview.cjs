const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');const admin=process.env.KONSOLISS_ADMIN_ROOT||path.resolve(root,'../admin');
const target=path.join(admin,'src/features/admin/screens/content/konsolissPreview');
const check=process.argv.includes('--check');const hashes={},generated={};let failed=false;
function put(name,content){content=String(content).replace(/[ \t]+$/gm,'').replace(/\n+$/,'')+'\n';if(name!=='source-manifest.json')generated[name]=crypto.createHash('sha256').update(content).digest('hex');const dest=path.join(target,name);if(check){if(!fs.existsSync(dest)||!fs.readFileSync(dest).equals(Buffer.from(content))){console.error('Preview out of sync: '+name);failed=true;}}else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);}}
function source(name){const value=fs.readFileSync(path.join(root,'src/screens/Konsoliss',name));hashes[name]=crypto.createHash('sha256').update(value).digest('hex');return value.toString();}
let home=source('konsolissHomeScreen.tsx');
for(const name of ['useKonsolissCopy','useCurrentKonsolissContainer','useKonsolissLoadProgress','useKonsolissContainerOccupancy','useKonsolissAssignedContainers','konsolissDemoContainers','supportApi'])home=home.replaceAll("'./"+name+"'","'./previewData'");
home=home.replaceAll("'../../shared/quickMenu/useFeatureTheme'","'./previewData'").replaceAll("'./KonsolissQuickMenu'","'./PreviewQuickMenu'").replace(', Modal,',',');
home=home.replace(/require\('\.\.\/\.\.\/assets\/konsoliss\/([^']+)'\)/g,(_match,file)=>{const bytes=fs.readFileSync(path.join(root,'src/assets/konsoliss',file));const hash=crypto.createHash('sha256').update(bytes).digest('hex');hashes['assets/'+file]=hash;return '{uri:'+JSON.stringify('https://raw.githubusercontent.com/momojdy/tiss_tiss_beta/main/src/assets/konsoliss/'+file+'?v='+hash)+'}';});
home="// Generated from the approved consumer homepage. Run sync-konsoliss-preview.cjs.\nimport {Modal} from './PreviewModal';\n"+home;
put('konsolissHomeScreen.tsx',home);
for(const name of ['KonsolissContent.tsx','cms/catalog.ts','cms/model.ts','konsolissNumbers.ts','konsolissLoadModel.ts','konsolissOccupancyModel.ts','konsolissPreviewScenarios.ts','useKonsolissPreviewController.ts'])put(name,source(name));
put('ThinMenuIcon.tsx',fs.readFileSync(path.join(root,'src/shared/quickMenu/ThinMenuIcon.tsx')));
put('KonsolissQuickMenuView.tsx',source('KonsolissQuickMenuView.tsx').replace("'../../shared/quickMenu/ThinMenuIcon'","'./ThinMenuIcon'").replace('{Modal,','{').replace(',Modal,',',').replace("import React,", "import {Modal} from './PreviewModal';\nimport React,"));
put('source-manifest.json',JSON.stringify({generator:'sync-konsoliss-preview.cjs',sources:hashes,generated},null,2)+'\n');
if(failed)process.exitCode=1;else console.log(check?'PASS: Konsoliss preview matches consumer sources and assets':'Synchronized Konsoliss homepage preview');
