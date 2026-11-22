/* Prepare the requested FAQ repair separately from the translation-only release. No network or publishing. */
const fs=require('node:fs'),path=require('node:path');
const root=path.dirname(require.resolve('../package.json'));
const {locales,sha,english,fields}=require('./prepare-goodies-translations.cjs');
const isPlaceholder=value=>/^\s*answer coming soon[.!]?\s*$/i.test(english(value));
function rebaseCurrentFees(translated,original,current){
 if(original.id!==current.id||original.version!==current.version||current.status!=='published'||current.locale!=='en')throw Error('The published CMS baseline changed; refresh the content candidate before proceeding.');
 const before=structuredClone(original.payload),after=structuredClone(current.payload);delete before.fees;delete after.fees;
 if(sha(before)!==sha(after))throw Error('Published content changed outside fees; merge current content before proceeding.');
 const result=structuredClone(translated);result.fees=structuredClone(current.payload.fees);return result;
}
function repairFaq(payload,copy){
 const result=structuredClone(payload),changed=[];
 for(const [index,row] of (result.faq||[]).entries()){
  if(!isPlaceholder(row.a))continue;
  const question=english(row.q),answers=copy[question];
  if(!answers)throw Error('No reviewed replacement supplied for FAQ '+index);
  const text=typeof row.a==='object'&&row.a?structuredClone(row.a):{};
  for(const locale of locales){
   if(typeof answers[locale]!=='string'||!answers[locale].trim()||isPlaceholder(answers[locale]))throw Error('Incomplete FAQ replacement: '+index+' '+locale);
   text[locale]={v:answers[locale],s:'reviewed',origin:locale==='en'?'assistant_authored_factual_help':'assistant_translation',human_reviewed:false,approval_basis:'user_requested_goodies_placeholder_completion'};
  }
  row.a=text;changed.push({index,question,locales});
 }
 return{payload:result,changed};
}
module.exports={repairFaq,isPlaceholder,rebaseCurrentFees};
if(require.main===module){
 const base=path.resolve('docs/goodies/localization-release/publish-payload.json'),output=path.resolve(process.argv[2]||'docs/goodies/content-acceptance-release');
 const payload=JSON.parse(fs.readFileSync(base)),copy=JSON.parse(fs.readFileSync(path.join(root,'docs/goodies/content-acceptance-release/faq-copy.json')));
 const sourceManifest=JSON.parse(fs.readFileSync(path.join(path.dirname(base),'manifest.json')));
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/goodies/content-acceptance-release/baseline.json'))),original=JSON.parse(fs.readFileSync(path.join(root,'docs/goodies/localization-release/baseline.json')));
 const result=repairFaq(rebaseCurrentFees(payload,original,baseline),copy);
 if(result.payload.faq.some(row=>isPlaceholder(row.a)))throw Error('FAQ placeholders remain');
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'publish-payload.json'),JSON.stringify(result.payload)+'\n');
 fs.writeFileSync(path.join(output,'baseline.json'),JSON.stringify(baseline)+'\n');
 fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({status:'PREPARED_NOT_PUBLISHED',sourceBaseline:{id:baseline.id,version:baseline.version,payloadSha256:sha(baseline.payload)},sourcePayloadSha256:sha(payload),payloadSha256:sha(result.payload),changes:result.changed,unmodified:'Non-FAQ text from the authorized translation candidate, current live financial configuration, policy documents and every existing Haitian Creole entry',humanReviewClaim:false,publicationPerformed:false,fields:fields(result.payload).length,currentPushFields:sourceManifest.currentPushFields,checkoutScheduleField:sourceManifest.checkoutScheduleField},null,2)+'\n');
 console.log('PASS: '+result.changed.length+' FAQ answers replaced in en/fr/es/zh-Hans; no live publication or Haitian edits.');
}
