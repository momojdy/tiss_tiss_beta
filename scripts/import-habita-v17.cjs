// Run at repo root: node scripts/import-habita-v17.cjs /path/to/Habita_Homepage_V17.html
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=process.argv[2];
if(!source)throw Error('Supply the frozen V17 HTML path.');
const bytes=fs.readFileSync(source),expected='0fcddb2df9cd49369f586b7a2d6d444a1dc3c342c6b5d3401a97dffb0fe263de';
if(sha(bytes)!==expected)throw Error('V17 source checksum mismatch; refusing to alter assets.');
const html=bytes.toString('utf8'),dir=path.join(process.cwd(),'src/screens/Habita'),items=[];
for(const [name,prefix,count] of [['PICS','property-',20],['PLACES','place-',6],['WIDE','wide',1]]){
 const found=html.match(new RegExp('const '+name+'=(\\[[\\s\\S]*?\\]|"data:image[^"\\n]+")\\s*;'));
 if(!found)throw Error('Missing '+name);
 const urls=[...found[1].matchAll(/data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)/g)];
 if(urls.length!==count)throw Error('Unexpected '+name+' count');
 urls.forEach((m,i)=>{const key=prefix==='wide'?prefix:prefix+i;const ext=m[1]==='jpeg'?'jpg':m[1];const data=Buffer.from(m[2],'base64');if(!data.length)throw Error('Empty asset');items.push({key,file:key+'.'+ext,data,sha256:sha(data),bytes:data.length});});
}
fs.mkdirSync(path.join(dir,'assets'),{recursive:true});
for(const item of items)fs.writeFileSync(path.join(dir,'assets',item.file),item.data);
const manifest={sourceSha256:expected,assets:items.map(({data,...rest})=>rest)};
fs.writeFileSync(path.join(dir,'assets','manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(dir,'media.ts'),"import type {ImageSourcePropType} from 'react-native';\n// Generated from frozen V17; development fixtures only.\nexport const media:Record<string,ImageSourcePropType>={\n"+items.map(i=>"  '"+i.key+"':require('./assets/"+i.file+"'),").join('\n')+'\n};\n');
console.log('Imported '+items.length+' byte-identical assets from V17.');
