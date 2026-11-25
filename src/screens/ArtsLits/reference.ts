import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export async function loadReference(): Promise<string> {
  const asset = Asset.fromModule(require('./homepage-v8.html'));
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const html = Platform.OS === 'web'
    ? await fetch(uri).then(r => { if (!r.ok) throw new Error('Unable to load V8'); return r.text(); })
    : await new File(uri).text();
  if (html.includes('data-arts-lits-missing-reference') || !html.includes('data:image/')) {
    throw new Error('The approved offline V8 HTML has not been imported.');
  }
  return html;
}

// Runtime-only navigation adapter. The approved HTML asset is never rewritten.
export const bridge = `(function(){
  function send(value){
    if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(value);
    else if(window.parent!==window) window.parent.postMessage(value,'*');
  }
  document.addEventListener('click',function(event){
    if(event.target instanceof Element && event.target.closest('.top .back')){
      event.preventDefault();event.stopImmediatePropagation();send('arts-lits:back');
    }
  },true);
  window.addEventListener('message',function(event){
    if(event.source===window.parent && event.data==='arts-lits:hardware-back') window.artsLitsBack();
  });
  window.artsLitsBack=function(){
    var panel=document.querySelector('.overlay.open');
    if(panel && typeof backPanel==='function') backPanel();
    else send('arts-lits:back');
  };
  function theme(){send('arts-lits:theme:'+(document.documentElement.dataset.theme==='dark'?'dark':'light'))}
  new MutationObserver(theme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});theme();
})();`;

export function withBridge(html: string): string {
  return html.replace(/<\/body>\s*<\/html>\s*$/i, '<script>'+bridge+'</script></body></html>');
}
