// Analyst-entered statewide-contract vendors + state contract-data links.
// GET /api/vendors (public) -> {vendors:{ST:[...]},links:{ST:[...]}}
// POST /api/vendors?token=...  {action:'add'|'import'|'remove'|'link'|'unlink'|'fetch', state, ...}
import {timingSafeEqual,randomUUID} from 'node:crypto';
import {safeFetch} from './lib/linkpull.mjs';
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const eq=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export const CATS=['strategy','emergency','audit'];
const https=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:null}catch(e){return null}};
const t=(v,n)=>String(v==null?'':v).trim().slice(0,n);
export function cleanVendor(b,source='manual'){const state=t(b.state,20).toUpperCase(),category=t(b.category,12).toLowerCase(),firm=t(b.firm,120),link=https(b.contractUrl);
  if(!/^[A-Z]{2}$/.test(state)||!CATS.includes(category)||!firm||!link)return null;
  return {id:randomUUID(),state,category,firm,scope:t(b.scope,300),agency:t(b.agency,120),period:t(b.period,80),value:t(b.value,60),contractUrl:link,note:t(b.note,300),source,addedAt:new Date().toISOString()}}
export function cleanLink(b){const state=t(b.state,20).toUpperCase(),url=https(b.url);if(!/^[A-Z]{2}$/.test(state)||!url)return null;return {id:randomUUID(),state,url,label:t(b.label,100)||'State contract data',addedAt:new Date().toISOString()}}
const group=l=>l.reduce((o,v)=>((o[v.state]=o[v.state]||[]).push(v),o),{});
export default async(req,ctx,deps={})=>{
  const store=deps.store||(await import('@netlify/blobs')).getStore('wob');
  const rd=async k=>(await store.get(k,{type:'json'}).catch(()=>null))||[];
  if(req.method==='GET')return J({vendors:group(await rd('manual-vendors')),links:group(await rd('contract-links'))});
  const tok=process.env.REFRESH_TOKEN||'',q=new URL(req.url).searchParams.get('token')||'';
  if(!tok||!eq(q,tok))return J({error:'forbidden',message:'Missing or wrong refresh token.'},403);
  let b;try{b=await req.json()}catch(e){return J({error:'bad_request'},400)}
  const a=b.action;let vs=await rd('manual-vendors'),ls=await rd('contract-links');
  if(a==='add'||a==='import'){const src=a==='add'?'manual':'import';const rows=a==='add'?[b]:(Array.isArray(b.rows)?b.rows.slice(0,500):[]);let ok=0,skipped=0;
    for(const r of rows){const v=cleanVendor({...r,state:r.state||b.state},src);if(!v){skipped++;continue}
      if(vs.some(x=>x.state===v.state&&x.category===v.category&&x.firm.toLowerCase()===v.firm.toLowerCase()&&x.contractUrl===v.contractUrl)){skipped++;continue}vs.push(v);ok++}
    if(a==='add'&&!ok)return J({error:'bad_vendor',message:'Need a 2-letter state, a category (strategy, emergency or audit), a firm name, and an https link to the contract.'},400);
    await store.setJSON('manual-vendors',vs);return J({ok:true,added:ok,skipped,vendors:group(vs)})}
  if(a==='remove'){vs=vs.filter(x=>x.id!==b.id);await store.setJSON('manual-vendors',vs);return J({ok:true,vendors:group(vs)})}
  if(a==='link'){const l=cleanLink(b);if(!l)return J({error:'bad_link',message:'Need a state and an https link.'},400);ls=ls.filter(x=>!(x.state===l.state&&x.url===l.url));ls.push(l);await store.setJSON('contract-links',ls);return J({ok:true,links:group(ls)})}
  if(a==='unlink'){ls=ls.filter(x=>x.id!==b.id);await store.setJSON('contract-links',ls);return J({ok:true,links:group(ls)})}
  if(a==='fetch'){const u=https(b.url);if(!u)return J({error:'bad_link',message:'Need an https link.'},400);
    try{const f=await (deps.safeFetch||safeFetch)(u,{sheets:true,maxBytes:6e6});const isX=/spreadsheet|excel|octet-stream/.test(f.ct)||/\.xlsx?(\?|$)/i.test(f.url);
      if(/html|pdf/.test(f.ct)&&!isX)return J({error:'not_tabular',message:'That link is a web page or PDF, not a CSV/Excel file. Save it as a link instead, or download the data and upload it.'},422);
      return J({ok:true,kind:isX?'xlsx':'csv',data:isX?f.buf.toString('base64'):f.buf.toString('utf8')})}
    catch(e){return J({error:'fetch_failed',message:String(e.message||e)},502)}}
  return J({error:'bad_action'},400)};
