import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadReference, withBridge } from './reference';

export default function ArtsLitsHomeScreen({onBack}:{onBack:()=>void}) {
  const frame=useRef<HTMLIFrameElement>(null);
  const [html,setHtml]=useState<string>();
  const [error,setError]=useState<string>();
  const srcDoc=useMemo(()=>html?withBridge(html):undefined,[html]);
  useEffect(()=>{let active=true;loadReference().then(v=>{if(active)setHtml(v)}).catch(e=>{if(active)setError(String(e.message??e))});return()=>{active=false}},[]);
  useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source===frame.current?.contentWindow&&e.data==='arts-lits:back')onBack()};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[onBack]);
  if(error)return <div role="alert">{error}<button onClick={onBack}>Return to Wantiss</button></div>;
  if(!srcDoc)return <div role="status">Loading Arts &amp; Lits…</div>;
  return <iframe ref={frame} title="Arts & Lits homepage" srcDoc={srcDoc} sandbox="allow-scripts" style={{border:0,width:'100%',flex:1,minHeight:0,background:'#f4f0e8'}}/>;
}
