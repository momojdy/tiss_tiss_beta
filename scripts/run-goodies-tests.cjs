const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
for(const file of fs.readdirSync(path.join(__dirname,'../tests')).filter(file=>/^goodies-.*\.test\.cjs$/.test(file)).sort()){
 const result=spawnSync(process.execPath,[path.join(__dirname,'../tests',file)],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
