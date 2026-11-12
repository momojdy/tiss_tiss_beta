import {resolveGoodiesText} from '../../../src/features/Goodies/i18n/resolveText.ts';
import type {Txt} from '../../../src/features/Goodies/data/types.ts';
function equal(actual: string, expected: string) {if(actual!==expected)throw new Error(`Expected ${expected}, got ${actual}`);}
const text: Txt={en:{v:'English',s:'reviewed'},fr:{v:'Français',s:'draft'},ht:{v:'Kreyòl',s:'draft'},es:{v:'Español',s:'reviewed'},'zh-Hans':{v:'中文',s:'missing'}};
Deno.test('production falls back to English for missing and unreviewed translations in all five locales',()=>{
  for(const locale of ['en','fr','ht','zh-Hans'] as const)equal(resolveGoodiesText(text,locale),'English');
  equal(resolveGoodiesText(text,'es'),'Español');
});
Deno.test('Haitian Creole is available in production only after explicit human review',()=>{
  equal(resolveGoodiesText(text,'ht'),'English');
  equal(resolveGoodiesText({...text,ht:{v:'Kreyòl',s:'reviewed'}},'ht'),'Kreyòl');
  equal(text.ht!.s,'draft');
});
Deno.test('draft preview is explicit and never changes review metadata',()=>{
  equal(resolveGoodiesText(text,'ht',true),'Kreyòl');
  equal(resolveGoodiesText({...text,ht:{v:'Kreyòl',s:'missing'}},'ht',true),'English');
  equal(text.ht!.s,'draft');
});
Deno.test('empty and legacy text have predictable fallbacks',()=>{
  equal(resolveGoodiesText(null,'en'),'');equal(resolveGoodiesText('Legacy text','fr'),'Legacy text');
  equal(resolveGoodiesText({en:{v:'English',s:'reviewed'},es:{v:'',s:'reviewed'}},'es'),'English');
});

Deno.test('unreviewed English cannot bypass review by becoming the production fallback',()=>{
  const draft:Txt={en:{v:'Unreviewed critical text',s:'draft'},ht:{v:'Unreviewed Creole',s:'draft'}};
  equal(resolveGoodiesText(draft,'en'),'');equal(resolveGoodiesText(draft,'ht'),'');
  equal(resolveGoodiesText(draft,'en',true),'Unreviewed critical text');
});
